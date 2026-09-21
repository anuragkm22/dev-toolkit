import type { DiffNode, DiffStatus, JsonValue } from "./types";

/**
 * Recursively diffs two parsed JSON/YAML values and returns a tree of
 * DiffNodes describing what's unchanged/added/removed/changed.
 *
 * Because this operates on already-parsed values (not raw text), key
 * reordering is a non-issue by construction — object keys are compared
 * by name, not by position.
 */
export function diffValues(left: JsonValue, right: JsonValue): DiffNode {
  return diffNode("", "", left, right);
}

function diffNode(
  key: string,
  path: string,
  left: JsonValue | undefined,
  right: JsonValue | undefined,
): DiffNode {
  // One side missing entirely -> added or removed.
  if (left === undefined) {
    return { key, path, status: "added", right };
  }
  if (right === undefined) {
    return { key, path, status: "removed", left };
  }

  const leftIsObject = isPlainObject(left);
  const rightIsObject = isPlainObject(right);
  const leftIsArray = Array.isArray(left);
  const rightIsArray = Array.isArray(right);

  // Both objects: diff by key, regardless of key order in the source.
  if (leftIsObject && rightIsObject) {
    return diffObjects(key, path, left, right);
  }

  // Both arrays: diff by index (order matters for arrays — reordering
  // a list is a real semantic change, unlike reordering object keys).
  if (leftIsArray && rightIsArray) {
    return diffArrays(key, path, left, right);
  }

  // Type mismatch between containers and scalars (e.g. object vs array,
  // or object vs string) is always a change.
  if (leftIsObject !== rightIsObject || leftIsArray !== rightIsArray) {
    return { key, path, status: "changed", left, right };
  }

  // Both scalars.
  const status: DiffStatus = scalarsEqual(left, right) ? "unchanged" : "changed";
  return { key, path, status, left, right };
}

function diffObjects(
  key: string,
  path: string,
  left: Record<string, JsonValue>,
  right: Record<string, JsonValue>,
): DiffNode {
  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const children: DiffNode[] = [];

  for (const childKey of allKeys) {
    const childPath = path ? `${path}.${childKey}` : childKey;
    children.push(diffNode(childKey, childPath, left[childKey], right[childKey]));
  }

  return {
    key,
    path,
    status: summarizeStatus(children),
    children,
  };
}

function diffArrays(
  key: string,
  path: string,
  left: JsonValue[],
  right: JsonValue[],
): DiffNode {
  const maxLength = Math.max(left.length, right.length);
  const children: DiffNode[] = [];

  for (let i = 0; i < maxLength; i++) {
    const childPath = `${path}[${i}]`;
    children.push(diffNode(String(i), childPath, left[i], right[i]));
  }

  return {
    key,
    path,
    status: summarizeStatus(children),
    children,
  };
}

/** A container's own status: unchanged only if every child is unchanged. */
function summarizeStatus(children: DiffNode[]): DiffStatus {
  return children.every((child) => child.status === "unchanged")
    ? "unchanged"
    : "changed";
}

function isPlainObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Scalar equivalence rules (the "format-tolerant comparison" requirement):
 * - Numbers compare by value, so 1 and 1.0 are equal (JS has one number
 *   type, so this is actually automatic — 1 === 1.0 in JS already).
 * - Booleans and strings compare by strict equality here in Phase 1a.
 *   Case-insensitive boolean handling (true/True) and quoted-vs-unquoted
 *   string equivalence are addressed in Phase 1b once YAML parsing is in
 *   place, since that's where those distinctions actually originate.
 */
function scalarsEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return left === right;
}
