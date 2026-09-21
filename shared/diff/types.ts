// Shared types for the structural diff tree.
//
// We diff *parsed* values (not raw text), which is what makes key
// reordering and quote/type equivalence a non-issue: by the time we
// compare two objects, ordering and source formatting are already gone.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** How a single node compares between the left (original) and right (changed) side. */
export type DiffStatus = "unchanged" | "added" | "removed" | "changed";

/**
 * One node in the diff tree. Leaf nodes (scalars) carry their left/right
 * values directly. Object/array nodes carry `children` and their own
 * left/right values are left undefined once expanded into children.
 */
export interface DiffNode {
  /** Property key or array index this node represents, or "" for the root. */
  key: string;
  /** Dot/bracket path from the root, e.g. "spec.containers[0].image". */
  path: string;
  status: DiffStatus;
  /** Present for unchanged/removed/changed leaf or container summary values. */
  left?: JsonValue;
  /** Present for unchanged/added/changed leaf or container summary values. */
  right?: JsonValue;
  /** Present when this node is an object or array with nested diffed entries. */
  children?: DiffNode[];
}

/** Location of a syntax error in the original input text. */
export interface ParseErrorLocation {
  line: number; // 1-indexed
  column: number; // 1-indexed
  message: string;
}

export type ParseResult =
  | { ok: true; value: JsonValue }
  | { ok: false; error: ParseErrorLocation };
