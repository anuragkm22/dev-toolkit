import { parseJson } from "./parseJson";
import { parseYaml } from "./parseYaml";
import type { Format } from "./detectFormat";
import type { ParseResult } from "./types";

/** Parses source text using the given format's parser. */
export function parseInput(source: string, format: Format): ParseResult {
  return format === "json" ? parseJson(source) : parseYaml(source);
}
