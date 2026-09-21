import "./style.css";
import { diffValues } from "../shared/diff/jsonDiff";
import { renderDiff } from "../shared/diff/renderDiff";
import { exportAsPlainText, exportAsMarkdown } from "../shared/diff/exportDiff";
import type { DiffNode } from "../shared/diff/types";
import { InputPanel } from "../shared/inputPanel";
import { renderTopbar, renderFooter, renderPanelMarkup } from "../shared/pageChrome";
import { buildShareUrl, readStateFromLocation, ShareLinkTooLargeError } from "./share/urlState";

// Phase 1b: YAML support, auto-detect with a manual Auto/JSON/YAML toggle
// per panel, and built-in JSON <-> YAML conversion.
// Phase 1c: shareable links (state encoded in the URL hash) and
// copy/export of the diff as plain text or markdown.
// Phase 1e: cross-links to the standalone JSON/YAML validator pages.

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${renderTopbar()}

  <div class="page">
    <header class="site-header">
      <h1>Config Diff &amp; Validator</h1>
      <p class="subtitle">Paste two JSON or YAML blocks to compare them. Key reordering and equivalent value formats are ignored automatically.</p>
      <p class="tool-crosslinks">
        Just need to validate one file? Try the
        <a href="/json-validator/">JSON Validator</a> or
        <a href="/yaml-validator/">YAML Validator</a>.
      </p>
    </header>

    <main class="diff-layout">
      ${renderPanelMarkup("input-left", "Original")}
      ${renderPanelMarkup("input-right", "Changed")}
    </main>

    <div class="actions">
      <button id="diff-button" type="button" class="btn-primary">Compare</button>
      <button id="share-button" type="button" class="btn-secondary">Copy shareable link</button>
    </div>

    <section class="output-panel" id="output-panel">
      <div class="output-toolbar" id="output-toolbar" hidden>
        <button type="button" id="copy-text-button" class="btn-ghost">Copy as text</button>
        <button type="button" id="copy-markdown-button" class="btn-ghost">Copy as markdown</button>
      </div>
      <div id="output-body">
        <p class="placeholder">Your diff will appear here once you click Compare.</p>
      </div>
    </section>

    ${renderFooter()}
  </div>
`;

const leftPanelEl = document.querySelector<HTMLElement>('[data-panel-id="input-left"]')!;
const rightPanelEl = document.querySelector<HTMLElement>('[data-panel-id="input-right"]')!;
const leftPanel = new InputPanel(leftPanelEl);
const rightPanel = new InputPanel(rightPanelEl);

const diffButton = document.querySelector<HTMLButtonElement>("#diff-button")!;
const shareButton = document.querySelector<HTMLButtonElement>("#share-button")!;
const outputToolbar = document.querySelector<HTMLElement>("#output-toolbar")!;
const outputBody = document.querySelector<HTMLElement>("#output-body")!;
const copyTextButton = document.querySelector<HTMLButtonElement>("#copy-text-button")!;
const copyMarkdownButton = document.querySelector<HTMLButtonElement>("#copy-markdown-button")!;

let lastDiffTree: DiffNode | null = null;

diffButton.addEventListener("click", () => {
  runDiff();
});

shareButton.addEventListener("click", () => {
  copyShareLink();
});

copyTextButton.addEventListener("click", () => {
  if (lastDiffTree) copyToClipboard(exportAsPlainText(lastDiffTree), copyTextButton);
});

copyMarkdownButton.addEventListener("click", () => {
  if (lastDiffTree) copyToClipboard(exportAsMarkdown(lastDiffTree), copyMarkdownButton);
});

function runDiff(): void {
  const leftResult = leftPanel.parse();
  const rightResult = rightPanel.parse();

  if (!leftResult.ok) {
    lastDiffTree = null;
    outputToolbar.hidden = true;
    renderError(outputBody, "Original", leftResult.error);
    return;
  }
  if (!rightResult.ok) {
    lastDiffTree = null;
    outputToolbar.hidden = true;
    renderError(outputBody, "Changed", rightResult.error);
    return;
  }

  const diffTree = diffValues(leftResult.value, rightResult.value);
  lastDiffTree = diffTree;
  outputToolbar.hidden = false;
  renderDiff(outputBody, diffTree);
}

function renderError(
  container: HTMLElement,
  side: string,
  error: { line: number; column: number; message: string },
): void {
  container.innerHTML = "";
  const errorBox = document.createElement("div");
  errorBox.className = "diff-error";
  errorBox.textContent = `${side} input — invalid syntax at line ${error.line}, column ${error.column}: ${error.message}`;
  container.appendChild(errorBox);
}

async function copyShareLink(): Promise<void> {
  let url: string;

  try {
    url = await buildShareUrl({
      left: leftPanel.value,
      right: rightPanel.value,
      leftMode: leftPanel.formatMode,
      rightMode: rightPanel.formatMode,
    });
  } catch (err) {
    if (err instanceof ShareLinkTooLargeError) {
      showShareError(
        `This input is too large to share via link (${err.actualLength.toLocaleString()} characters, limit is ${err.limit.toLocaleString()}). Try sharing the files directly, or use "Copy as text" / "Copy as markdown" instead.`,
      );
      return;
    }
    throw err;
  }

  // Update the visible URL too, so the address bar itself is shareable
  // even without using the button again.
  window.history.replaceState(null, "", url);

  await copyToClipboard(url, shareButton, "Link copied");
}

function showShareError(message: string): void {
  outputToolbar.hidden = true;
  outputBody.innerHTML = "";
  const errorBox = document.createElement("div");
  errorBox.className = "diff-error";
  errorBox.textContent = message;
  outputBody.appendChild(errorBox);
}

async function copyToClipboard(
  text: string,
  button: HTMLButtonElement,
  successLabel = "Copied",
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API can fail without a secure context or permission;
    // fall back to a manual selection prompt is overkill for this tool,
    // so we just surface the failure via the button label.
    flashButtonLabel(button, "Copy failed");
    return;
  }
  flashButtonLabel(button, successLabel);
}

function flashButtonLabel(button: HTMLButtonElement, label: string): void {
  const original = button.dataset.originalLabel ?? button.textContent ?? "";
  button.dataset.originalLabel = original;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = original;
  }, 1500);
}

// On load: if the URL hash carries shared state, restore both panels
// and run the diff immediately so a shared link shows the result right away.
void (async () => {
  const state = await readStateFromLocation();
  if (!state) return;

  leftPanel.setState(state.left, state.leftMode);
  rightPanel.setState(state.right, state.rightMode);
  runDiff();
})();
