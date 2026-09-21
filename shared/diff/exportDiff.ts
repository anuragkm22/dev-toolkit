import type { DiffNode } from "./types";
import { flattenDiff } from "./renderDiff";

const MARKERS: Record<DiffNode["status"], string> = {
  added: "+",
  removed: "-",
  changed: "~",
  unchanged: " ",
};

/**
 * Renders a diff tree as plain text, suitable for pasting into Slack or
 * a terminal. Uses +/-/~ markers, same convention as the on-screen view.
 */
export function exportAsPlainText(root: DiffNode): string {
  const lines = flattenDiff(root);
  return lines
    .map((line) => {
      const indent = "  ".repeat(line.depth);
      const marker = MARKERS[line.status];
      const suffix = line.isContainer ? ":" : `: ${line.valueText}`;
      return `${marker} ${indent}${line.key}${suffix}`;
    })
    .join("\n");
}

/**
 * Renders a diff tree as markdown, suitable for pasting into a PR
 * description or GitHub/GitLab comment. Uses a fenced diff code block so
 * +/-/~ lines get colored automatically by most markdown renderers that
 * support diff syntax highlighting.
 */
export function exportAsMarkdown(root: DiffNode): string {
  const lines = flattenDiff(root);
  const body = lines
    .map((line) => {
      const indent = "  ".repeat(line.depth);
      const marker = MARKERS[line.status];
      const suffix = line.isContainer ? ":" : `: ${line.valueText}`;
      return `${marker} ${indent}${line.key}${suffix}`;
    })
    .join("\n");

  return "```diff\n" + body + "\n```";
}
