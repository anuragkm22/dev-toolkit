import { load, YAMLException } from "js-yaml";
import type { ParseResult } from "./types";

/**
 * Parses a YAML string and reports errors with an exact line/column,
 * including indentation errors — the #1 silent-failure bug in YAML files.
 *
 * js-yaml's YAMLException carries a `mark` with 0-indexed line/column,
 * which we convert to 1-indexed to match parseJson's convention and
 * typical editor line numbering.
 */
export function parseYaml(source: string): ParseResult {
  try {
    const value = load(source);
    // js-yaml returns `undefined` for empty/whitespace-only input rather
    // than throwing. Treat that as an empty object so downstream diffing
    // has something to compare against instead of crashing on undefined.
    return { ok: true, value: value === undefined ? {} : (value as never) };
  } catch (err) {
    if (err instanceof YAMLException) {
      const mark = err.mark;
      return {
        ok: false,
        error: {
          line: mark ? mark.line + 1 : 1,
          column: mark ? mark.column + 1 : 1,
          message: err.reason || err.message,
        },
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { line: 1, column: 1, message } };
  }
}
