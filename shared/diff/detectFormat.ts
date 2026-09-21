export type Format = "json" | "yaml";

/** User-facing format selector, including the auto-detect default. */
export type FormatMode = "auto" | "json" | "yaml";

/**
 * Detects whether a string should be treated as JSON or YAML.
 *
 * Valid JSON is always classified as JSON — JSON is a strict subset of
 * YAML, so anything that parses cleanly as JSON is unambiguous. Anything
 * else (including plain YAML, or JSON with trailing commas/comments) is
 * treated as YAML, since js-yaml's parser is a superset that handles it.
 */
export function detectFormat(source: string): Format {
  try {
    JSON.parse(source);
    return "json";
  } catch {
    return "yaml";
  }
}

/** Resolves the format to actually parse with, given the user's toggle choice. */
export function resolveFormat(mode: FormatMode, source: string): Format {
  if (mode === "auto") {
    return detectFormat(source);
  }
  return mode;
}
