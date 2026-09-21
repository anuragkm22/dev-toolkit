import { ValidatorEditor } from "./validatorEditor";
import { parseInput } from "./diff/parseInput";
import { toJsonString, toYamlString } from "./diff/convert";
import type { Format } from "./diff/detectFormat";
import type { ParseResult } from "./diff/types";

/**
 * Renders the markup for a validator page's single input panel:
 * editor + Open file + Format + Minify + Copy + Reset. Deliberately
 * separate from shared/pageChrome.ts's renderPanelMarkup (used by the
 * diff tool), which has a format toggle and Convert button that don't
 * belong here — this page's format is fixed by which validator you're
 * on, not chosen per-panel.
 */
export function renderValidatorPanelMarkup(id: string, label: string): string {
  return `
    <section class="input-panel" data-panel-id="${id}">
      <div class="panel-head">
        <span class="panel-label" data-focus-target="${id}">${label}</span>
        <div class="panel-head-right">
          <button type="button" class="open-file-button">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h4l1.5 1.5H12.5A1.5 1.5 0 0 1 14 4v8.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-10Z" fill="none" stroke="currentColor" stroke-width="1.1"/>
            </svg>
            Open file
          </button>
          <input type="file" class="file-input" hidden />
        </div>
      </div>
      <div class="editor-host" id="${id}" aria-label="${label} input"></div>
      <div class="validator-toolbar">
        <button type="button" class="btn-ghost format-button">Format</button>
        <button type="button" class="btn-ghost minify-button">Minify</button>
        <button type="button" class="btn-ghost copy-button">Copy</button>
        <button type="button" class="btn-ghost reset-button">Reset</button>
      </div>
    </section>
  `;
}

export interface ValidatorPanelOptions {
  /** The format this panel accepts — fixed for the lifetime of the page. */
  format: Format;
  /** File extensions accepted by the Open file input, e.g. ".json". */
  fileAccept: string;
}

/**
 * Controls a validator page's single input panel: the editor, Open
 * file, Format, Minify, Copy, and Reset buttons. Each button's
 * behavior is intentionally minimal and format-locked — there's no
 * format toggle here, unlike the diff tool's InputPanel.
 */
export class ValidatorPanel {
  private readonly editor: ValidatorEditor;
  private readonly openFileButton: HTMLButtonElement;
  private readonly fileInput: HTMLInputElement;
  private readonly formatButton: HTMLButtonElement;
  private readonly minifyButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;

  constructor(root: HTMLElement, private readonly options: ValidatorPanelOptions) {
    const editorHost = root.querySelector<HTMLElement>(".editor-host")!;
    this.openFileButton = root.querySelector<HTMLButtonElement>(".open-file-button")!;
    this.fileInput = root.querySelector<HTMLInputElement>(".file-input")!;
    this.formatButton = root.querySelector<HTMLButtonElement>(".format-button")!;
    this.minifyButton = root.querySelector<HTMLButtonElement>(".minify-button")!;
    this.copyButton = root.querySelector<HTMLButtonElement>(".copy-button")!;
    this.resetButton = root.querySelector<HTMLButtonElement>(".reset-button")!;

    this.fileInput.accept = options.fileAccept;

    const label = options.format === "json" ? "JSON" : "YAML";
    this.editor = new ValidatorEditor(editorHost, options.format, `Paste ${label} here...`);

    const focusTarget = root.querySelector<HTMLElement>("[data-focus-target]");
    focusTarget?.addEventListener("click", () => this.editor.focus());

    this.openFileButton.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", () => this.loadFile());

    this.formatButton.addEventListener("click", () => this.format());
    this.minifyButton.addEventListener("click", () => this.minify());
    this.copyButton.addEventListener("click", () => this.copy());
    this.resetButton.addEventListener("click", () => this.reset());
  }

  get value(): string {
    return this.editor.value;
  }

  set value(text: string) {
    this.editor.value = text;
  }

  onChange(callback: () => void): void {
    this.editor.onChange(callback);
  }

  parse(): ParseResult {
    return parseInput(this.editor.value, this.options.format);
  }

  highlightError(line: number, column: number): void {
    this.editor.highlightError(line, column);
  }

  clearErrorHighlight(): void {
    this.editor.clearErrorHighlight();
  }

  /** Entirely client-side: FileReader never sends the file anywhere. */
  private loadFile(): void {
    const file = this.fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      this.editor.value = text;
    };
    reader.readAsText(file);

    // Reset so selecting the same file again still fires a change event.
    this.fileInput.value = "";
  }

  /** Pretty-prints the current input with standard indentation. Works
   * even on a single unformatted line, since formatting re-serializes
   * the parsed value rather than trying to reflow the existing text. */
  private format(): void {
    const result = this.parse();
    if (!result.ok) return; // can't format invalid input; leave it as-is

    this.editor.value =
      this.options.format === "json"
        ? toJsonString(result.value)
        : toYamlString(result.value);
  }

  /** Strips the input down to a single compact line. */
  private minify(): void {
    const result = this.parse();
    if (!result.ok) return;

    this.editor.value =
      this.options.format === "json" ? JSON.stringify(result.value) : minifyYaml(result.value);
  }

  private async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.editor.value);
      flashButtonLabel(this.copyButton, "Copied");
    } catch {
      flashButtonLabel(this.copyButton, "Copy failed");
    }
  }

  private reset(): void {
    this.editor.value = "";
  }
}

/**
 * YAML has no "minified" form in the JSON sense (removing all
 * whitespace would break YAML's indentation-based structure). The
 * closest useful equivalent — and what most YAML minifiers actually
 * do — is JSON's flow-collection style: valid YAML, but every mapping
 * and sequence written as {a: 1, b: [1, 2]} on one line instead of
 * block style across many lines.
 */
function minifyYaml(value: unknown): string {
  return toFlowYaml(value);
}

function toFlowYaml(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(toFlowYaml).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{${entries.map(([k, v]) => `${flowKey(k)}: ${toFlowYaml(v)}`).join(", ")}}`;
  }
  return String(value);
}

function flowKey(key: string): string {
  // Quote the key only if it needs it (contains characters that would
  // be ambiguous unquoted in YAML flow style).
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key);
}

function flashButtonLabel(button: HTMLButtonElement, label: string): void {
  const original = button.dataset.originalLabel ?? button.textContent ?? "";
  button.dataset.originalLabel = original;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = original;
  }, 1500);
}
