/**
 * Shared markup fragments used across every tool page: the top nav bar,
 * the site footer, and a single input panel (editor + format toggle +
 * open file + convert). Keeping these as plain string-returning
 * functions (not a templating library) matches the rest of the
 * codebase's "no framework" approach — Vite/TS handles the bundling,
 * these just avoid copy-pasting the same markup across three pages.
 */

export function renderTopbar(): string {
  return `
    <nav class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="/">Dev Toolkit</a>
        <div class="topbar-links">
          <a href="/about/">About</a>
          <a href="/privacy/">Privacy</a>
          <a href="/contact/">Contact</a>
        </div>
      </div>
    </nav>
  `;
}

export function renderFooter(): string {
  return `
    <footer class="site-footer">
      <p>Everything runs locally in your browser. Nothing you paste here is sent anywhere.</p>
      <p>
        <a href="/">Dev Toolkit</a> ·
        <a href="/about/">About</a> ·
        <a href="/privacy/">Privacy</a> ·
        <a href="/contact/">Contact</a>
      </p>
    </footer>
  `;
}

export interface PanelMarkupOptions {
  /**
   * When set, omits the Auto/JSON/YAML toggle and the Convert format
   * button — used on the standalone validator pages, where the format
   * is fixed by the page itself and those controls would be dead
   * weight (or actively confusing, since you can't actually act on
   * them there).
   */
  lockedFormat?: "json" | "yaml";
  /** Placeholder text shown in the empty editor. */
  placeholder?: string;
}

export function renderPanelMarkup(
  id: string,
  label: string,
  options: PanelMarkupOptions = {},
): string {
  const formatControls = options.lockedFormat
    ? ""
    : `
          <div class="format-toggle" role="group" aria-label="Format for ${label}">
            <button type="button" data-mode="auto">Auto</button>
            <button type="button" data-mode="json">JSON</button>
            <button type="button" data-mode="yaml">YAML</button>
          </div>
    `;

  // The panel footer only exists to hold the format badge and Convert
  // button — on a locked panel, neither is shown, so skip the footer
  // bar entirely rather than rendering an empty strip.
  const panelFoot = options.lockedFormat
    ? ""
    : `
      <div class="panel-foot">
        <span class="format-badge"></span>
        <button type="button" class="convert-button">Convert format</button>
      </div>
    `;

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
          <input type="file" class="file-input" accept=".json,.yaml,.yml,application/json,text/yaml,text/plain" hidden />
          ${formatControls}
        </div>
      </div>
      <div class="editor-host" id="${id}" aria-label="${label} input"></div>
      ${panelFoot}
    </section>
  `;
}
