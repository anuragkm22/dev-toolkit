import type { ParseResult } from "./types";

/**
 * Parses a JSON string and reports errors with an exact line/column,
 * instead of just the generic "Unexpected token" message JSON.parse
 * throws by default.
 *
 * V8's JSON.parse error messages come in a few different shapes
 * depending on the Chrome/Node version and the specific error:
 *   - "...at position N (line L column C)" — newer V8, gives us
 *     line/column directly, no math needed.
 *   - "...at position N" — older V8, only a character offset, which we
 *     convert to line/column by walking the source text.
 *   - "Unexpected token 'x', "<snippet>" is not valid JSON" — a newer
 *     V8 format for certain token errors that provides NO position at
 *     all, just a source snippet. We fall back to scanning the source
 *     for that snippet's start to at least get a line number.
 */
export function parseJson(source: string): ParseResult {
  try {
    const value = JSON.parse(source);
    return { ok: true, value };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    const direct = extractLineColumn(message);
    if (direct) {
      return { ok: false, error: { ...direct, message: cleanMessage(message) } };
    }

    const offset = extractPosition(message);
    if (offset !== null) {
      const { line, column } = offsetToLineColumn(source, offset);
      return { ok: false, error: { line, column, message: cleanMessage(message) } };
    }

    // No position info in the message at all (e.g. "Unexpected token 'x',
    // "<snippet>" is not valid JSON"). Try to locate the quoted snippet
    // in the source as a best-effort line number; otherwise fall back to
    // line 1 rather than claiming a precision we don't have.
    const snippetLine = locateSnippetLine(source, message);
    return {
      ok: false,
      error: { line: snippetLine ?? 1, column: 1, message: cleanMessage(message) },
    };
  }
}

/** Extracts an explicit "(line L column C)" pair, when V8 provides one directly. */
function extractLineColumn(message: string): { line: number; column: number } | null {
  const match = message.match(/line (\d+) column (\d+)/);
  if (!match) return null;
  return { line: Number(match[1]), column: Number(match[2]) };
}

/** Extracts the character offset from a V8 JSON.parse error message. */
function extractPosition(message: string): number | null {
  const match = message.match(/position (\d+)/);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * Some V8 error messages quote a snippet of the source instead of giving
 * a position (e.g. Unexpected token errors). This does a best-effort
 * search for that snippet's first line in the original source, so we can
 * at least point at the right line instead of always saying line 1.
 */
function locateSnippetLine(source: string, message: string): number | null {
  const snippetMatch = message.match(/"([^"]*)" is not valid JSON/);
  if (!snippetMatch) return null;

  const snippet = snippetMatch[1];
  // The snippet may be truncated with "..." at the start for long input.
  const searchText = snippet.startsWith("...") ? snippet.slice(3) : snippet;
  const firstLine = searchText.split("\n")[0];
  if (!firstLine) return null;

  const index = source.indexOf(firstLine);
  if (index === -1) return null;

  return offsetToLineColumn(source, index).line;
}

/** Converts a 0-indexed character offset into a 1-indexed line/column pair. */
function offsetToLineColumn(
  source: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Cleans up the raw V8 message for display: strips the redundant
 * "at position N (line L column C)" suffix since we report line/col
 * separately, and strips the quoted source snippet some messages
 * include (we show the line ourselves via the editor, so re-printing
 * a chunk of the user's own input back at them is just noise).
 */
function cleanMessage(message: string): string {
  return message
    .replace(/\s*at position \d+.*$/i, "")
    // "Unexpected token 'x', "<snippet>" is not valid JSON" — the
    // snippet can itself contain quotes (e.g. JSON object keys), so we
    // can't reliably match its closing quote. Instead, cut everything
    // after the known "Unexpected token 'x', " prefix, since the
    // snippet always runs to the end of the message from there.
    .replace(/^(Unexpected token '.'), .*$/s, "$1")
    .trim();
}
