import { ValidatorPanel } from "./validatorPanel";
import type { Format } from "./diff/detectFormat";

export interface ValidatorPageConfig {
  /** Which format this page validates. */
  forcedMode: Format;
  /** Label shown on the panel, e.g. "JSON" or "YAML". */
  formatLabel: string;
  /** File extensions accepted by the Open file input, e.g. ".json". */
  fileAccept: string;
}

/**
 * Wires up a single-input validator page: one editor panel, a Validate
 * button, and a result area that shows either a success message or an
 * error with exact line/column (plus an inline underline at the exact
 * error position in the editor itself). Shared by /json-validator/ and
 * /yaml-validator/ — the only difference between them is which format
 * is forced and the copy shown in the page header.
 */
export function initValidatorPage(config: ValidatorPageConfig): void {
  const panelEl = document.querySelector<HTMLElement>('[data-panel-id="validator-input"]')!;
  const panel = new ValidatorPanel(panelEl, {
    format: config.forcedMode,
    fileAccept: config.fileAccept,
  });

  const validateButton = document.querySelector<HTMLButtonElement>("#validate-button")!;
  const resultPanel = document.querySelector<HTMLElement>("#result-panel")!;

  validateButton.addEventListener("click", () => {
    runValidation(panel, resultPanel, config.formatLabel);
  });

  // Clear the inline error highlight as soon as the user edits the
  // input again, so a stale underline doesn't linger on text that's
  // already changed and hasn't been re-validated yet.
  panel.onChange(() => panel.clearErrorHighlight());
}

function runValidation(panel: ValidatorPanel, resultPanel: HTMLElement, formatLabel: string): void {
  resultPanel.innerHTML = "";
  panel.clearErrorHighlight();

  if (panel.value.trim() === "") {
    // Empty input technically parses as "valid" (an empty YAML document
    // is valid YAML), but showing a green success message for a blank
    // box is misleading — it reads as "nothing happened" rather than a
    // real result. Show a neutral prompt instead.
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = `Paste some ${formatLabel} first.`;
    resultPanel.appendChild(placeholder);
    return;
  }

  const result = panel.parse();

  if (result.ok) {
    const box = document.createElement("div");
    box.className = "result-valid";
    box.innerHTML = `
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm4.03 5.97-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06l1.47 1.47 4.47-4.47a.75.75 0 0 1 1.06 1.06Z" fill="currentColor"/>
      </svg>
      <span>Valid ${formatLabel} — no syntax errors found.</span>
    `;
    resultPanel.appendChild(box);
    return;
  }

  // Inline highlight at the exact error position, in addition to (not
  // instead of) the text report below.
  panel.highlightError(result.error.line, result.error.column);

  const errorBox = document.createElement("div");
  errorBox.className = "diff-error";
  errorBox.textContent = `Invalid ${formatLabel} at line ${result.error.line}, column ${result.error.column}: ${result.error.message}`;
  resultPanel.appendChild(errorBox);
}
