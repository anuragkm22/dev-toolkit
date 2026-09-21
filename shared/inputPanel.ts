import { detectFormat, resolveFormat, type Format, type FormatMode } from "./diff/detectFormat";
import { parseInput } from "./diff/parseInput";
import { toJsonString, toYamlString } from "./diff/convert";
import type { ParseResult } from "./diff/types";
import { CodeEditor } from "./codeEditor";

/**
 * Controls one input panel: its CodeMirror editor, format toggle
 * (Auto/JSON/YAML), the "detected as ___" badge, an Open file button,
 * and the convert-to-other-format button.
 *
 * Shared across every page that needs a JSON/YAML input box: the diff
 * tool (two panels, one per side) and the standalone validator pages
 * (one panel each). Each panel manages its own format mode
 * independently — on the diff tool that lets the two sides legitimately
 * be different formats; on a validator page it's just the one panel's
 * own toggle.
 */
export interface InputPanelOptions {
  /**
   * Locks the panel to a single format: hides the Auto/JSON/YAML toggle
   * and the Convert format button, since neither makes sense on a page
   * whose whole point is "validate this as YAML" (or JSON) specifically.
   * Leave unset for the diff tool, where switching formats and
   * converting between them are real, needed features.
   */
  lockedFormat?: Format;
}

export class InputPanel {
  private mode: FormatMode;
  private readonly lockedFormat: Format | null;
  private readonly editor: CodeEditor;
  private readonly badge: HTMLElement;
  private readonly toggleButtons: HTMLButtonElement[];
  private readonly convertButton: HTMLButtonElement | null;
  private readonly openFileButton: HTMLButtonElement;
  private readonly fileInput: HTMLInputElement;

  constructor(root: HTMLElement, options: InputPanelOptions = {}) {
    this.lockedFormat = options.lockedFormat ?? null;
    this.mode = this.lockedFormat ?? "auto";

    const editorHost = root.querySelector<HTMLElement>(".editor-host")!;
    // .format-badge doesn't exist in the markup for locked panels (see
    // pageChrome.ts) — fall back to a detached element so the rest of
    // this class can keep writing to `this.badge` unconditionally
    // without littering every call site with null checks.
    this.badge =
      root.querySelector<HTMLElement>(".format-badge") ?? document.createElement("span");
    this.toggleButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".format-toggle button"),
    );
    this.convertButton = root.querySelector<HTMLButtonElement>(".convert-button");
    this.openFileButton = root.querySelector<HTMLButtonElement>(".open-file-button")!;
    this.fileInput = root.querySelector<HTMLInputElement>(".file-input")!;

    const placeholderText = this.lockedFormat
      ? `Paste ${this.lockedFormat === "json" ? "JSON" : "YAML"} here...`
      : "Paste JSON or YAML here...";
    this.editor = new CodeEditor(editorHost, "json", placeholderText);
    this.editor.onChange(() => this.updateBadge());

    const focusTarget = root.querySelector<HTMLElement>("[data-focus-target]");
    focusTarget?.addEventListener("click", () => this.editor.focus());

    if (this.lockedFormat) {
      // Format toggle and convert button aren't rendered at all for
      // locked panels (see pageChrome.ts), but guard here too in case
      // markup changes later.
      this.toggleButtons = [];
      this.convertButton = null;
    } else {
      for (const button of this.toggleButtons) {
        button.addEventListener("click", () => {
          this.mode = button.dataset.mode as FormatMode;
          this.updateToggleUI();
          this.updateBadge();
        });
      }
      this.convertButton?.addEventListener("click", () => this.convert());
    }

    this.openFileButton.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", () => this.loadFile());

    this.updateToggleUI();
    this.updateBadge();
  }

  get value(): string {
    return this.editor.value;
  }

  get formatMode(): FormatMode {
    return this.mode;
  }

  /** Programmatically sets the editor content and format mode (used when
   * restoring state from a shared link). */
  setState(value: string, mode: FormatMode): void {
    this.editor.value = value;
    this.mode = mode;
    this.updateToggleUI();
    this.updateBadge();
  }

  /** The format that will actually be used to parse this panel's content. */
  get resolvedFormat(): Format {
    return resolveFormat(this.mode, this.editor.value);
  }

  parse(): ParseResult {
    return parseInput(this.editor.value, this.resolvedFormat);
  }

  private updateToggleUI(): void {
    for (const button of this.toggleButtons) {
      button.classList.toggle("active", button.dataset.mode === this.mode);
    }
  }

  private updateBadge(): void {
    if (this.editor.value.trim() === "") {
      this.badge.textContent = "";
      this.editor.setLanguage(this.lockedFormat ?? "json");
      return;
    }
    const format = this.resolvedFormat;
    this.editor.setLanguage(format);

    if (this.lockedFormat) {
      // No badge needed — the page itself already says "JSON Validator"
      // or "YAML Validator", so restating the format here is just noise.
      this.badge.textContent = "";
      return;
    }

    const label = format === "json" ? "JSON" : "YAML";
    this.badge.textContent =
      this.mode === "auto" ? `Detected: ${label}` : `Forced: ${label}`;
  }

  /** Reads the selected file from disk and loads its text into the editor.
   * Entirely client-side: FileReader never sends the file anywhere. */
  private loadFile(): void {
    const file = this.fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      this.editor.value = text;

      // On a locked panel (a validator page), keep the format locked
      // regardless of the uploaded file's extension — the page's whole
      // point is validating as that specific format. On the diff tool,
      // use the extension as a hint, since a .yml file that happens to
      // also be valid JSON should still be treated as YAML.
      if (!this.lockedFormat) {
        const extensionMode = modeFromFileName(file.name);
        if (extensionMode) {
          this.mode = extensionMode;
          this.updateToggleUI();
        }
      }
      this.updateBadge();
    };
    reader.readAsText(file);

    // Reset so selecting the same file again still fires a change event.
    this.fileInput.value = "";
  }

  /** Converts the current content to the other format, in place. */
  private convert(): void {
    const current = this.resolvedFormat;
    const target: Format = current === "json" ? "yaml" : "json";
    const result = parseInput(this.editor.value, current);

    if (!result.ok) {
      // Can't convert invalid input — leave it as-is, the Compare button
      // will surface the parse error with line/column when clicked.
      return;
    }

    this.editor.value =
      target === "json" ? toJsonString(result.value) : toYamlString(result.value);

    // Only force the toggle if the user had already forced one manually.
    // If they were on "auto", stay on "auto" — the new content will
    // correctly auto-detect as the target format anyway, and this avoids
    // permanently locking the panel out of auto-detect after one click.
    if (this.mode !== "auto") {
      this.mode = target;
      this.updateToggleUI();
    }
    this.updateBadge();
  }
}

/** Maps a file's extension to a forced format mode, or null if ambiguous. */
function modeFromFileName(fileName: string): FormatMode | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
  return null;
}

// Re-export for callers that just need format detection without a panel.
export { detectFormat };
