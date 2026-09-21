import { dump } from "js-yaml";
import type { JsonValue } from "./types";

/** Converts a parsed value to a pretty-printed JSON string. */
export function toJsonString(value: JsonValue): string {
  return JSON.stringify(value, null, 2);
}

/** Converts a parsed value to a YAML string. */
export function toYamlString(value: JsonValue): string {
  return dump(value, { indent: 2, lineWidth: -1 });
}
