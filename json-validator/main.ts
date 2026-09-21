import "../shared/validator.css";
import { renderTopbar, renderFooter } from "../shared/pageChrome";
import { renderValidatorPanelMarkup } from "../shared/validatorPanel";
import { initValidatorPage } from "../shared/validatorPage";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${renderTopbar()}

  <div class="page">
    <header class="site-header">
      <h1>JSON Validator</h1>
      <p class="subtitle">Paste JSON to instantly check it for syntax errors, with the exact line and column of any problem.</p>
      <p class="tool-crosslinks">
        Need to compare two files instead? Try the
        <a href="/json-yaml-diff/">Config Diff &amp; Validator</a>, or check
        <a href="/yaml-validator/">YAML</a> instead.
      </p>
    </header>

    <main class="validator-layout">
      ${renderValidatorPanelMarkup("validator-input", "JSON input")}

      <div class="actions">
        <button id="validate-button" type="button" class="btn-primary">Validate</button>
      </div>

      <section class="result-panel" id="result-panel">
        <p class="placeholder">Your result will appear here once you click Validate.</p>
      </section>
    </main>

    ${renderFooter()}
  </div>
`;

initValidatorPage({ forcedMode: "json", formatLabel: "JSON", fileAccept: ".json,application/json" });
