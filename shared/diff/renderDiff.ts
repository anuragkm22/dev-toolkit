import type { DiffNode, JsonValue } from "./types";

/** A single flattened line describing one diff node, used both for DOM
 * rendering and for plain text / markdown export, so all three outputs
 * stay in sync with one formatting source of truth. */
export interface DiffLine {
  depth: number;
  status: DiffNode["status"];
  key: string;
  isContainer: boolean;
  valueText: string; // "" for containers
}

/** Flattens a diff tree into an ordered list of lines (depth-first). */
export function flattenDiff(root: DiffNode): DiffLine[] {
  const lines: DiffLine[] = [];
  const nodes = root.children ?? [root];
  for (const node of nodes) {
    collectLines(node, 0, lines);
  }
  return lines;
}

function collectLines(node: DiffNode, depth: number, out: DiffLine[]): void {
  out.push({
    depth,
    status: node.status,
    key: node.key || "(root)",
    isContainer: Boolean(node.children),
    valueText: node.children ? "" : formatValueChange(node),
  });

  if (node.children) {
    for (const child of node.children) {
      collectLines(child, depth + 1, out);
    }
  }
}

/**
 * Renders a diff tree into a container element as a nested, indented
 * list. Each line shows the key, a status marker, and the value(s).
 */
export function renderDiff(container: HTMLElement, root: DiffNode): void {
  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "diff-tree";

  if (root.children) {
    for (const child of root.children) {
      list.appendChild(renderNode(child, 0));
    }
  } else {
    list.appendChild(renderNode(root, 0));
  }

  container.appendChild(list);
}

function renderNode(node: DiffNode, depth: number): HTMLElement {
  const row = document.createElement("div");
  row.className = `diff-row diff-row--${node.status}`;
  row.style.paddingLeft = `${depth * 1.25}rem`;

  const marker = document.createElement("span");
  marker.className = "diff-marker";
  marker.textContent = markerFor(node.status);
  row.appendChild(marker);

  const keyLabel = document.createElement("span");
  keyLabel.className = "diff-key";
  keyLabel.textContent = node.key || "(root)";
  row.appendChild(keyLabel);

  if (node.children) {
    row.appendChild(document.createTextNode(":"));
    const wrapper = document.createElement("div");
    wrapper.appendChild(row);
    for (const child of node.children) {
      wrapper.appendChild(renderNode(child, depth + 1));
    }
    return wrapper;
  }

  const valueLabel = document.createElement("span");
  valueLabel.className = "diff-value";
  valueLabel.textContent = formatValueChange(node);
  row.appendChild(document.createTextNode(": "));
  row.appendChild(valueLabel);

  return row;
}

function markerFor(status: DiffNode["status"]): string {
  switch (status) {
    case "added":
      return "+";
    case "removed":
      return "-";
    case "changed":
      return "~";
    case "unchanged":
      return " ";
  }
}

function formatValueChange(node: DiffNode): string {
  if (node.status === "added") {
    return formatScalar(node.right);
  }
  if (node.status === "removed") {
    return formatScalar(node.left);
  }
  if (node.status === "changed") {
    return `${formatScalar(node.left)} → ${formatScalar(node.right)}`;
  }
  return formatScalar(node.left);
}

function formatScalar(value: JsonValue | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}
