# Dev Toolkit

A small, ad-monetized site of developer utilities. 100% client-side —
no backend, no database, no API calls. Everything runs in the browser.

Flagship tool (Phase 1, complete): **Config Diff & Validator** —
`/json-yaml-diff/`. Paste two JSON or YAML blocks and get:

- A schema-aware visual diff (key reordering and equivalent value
  formats like `true`/`True` or quoted/unquoted strings are ignored)
- Auto-detection of JSON vs YAML, with a manual Auto/JSON/YAML toggle
  per input
- Syntax highlighting and line numbers (CodeMirror 6)
- Validation with exact line/column for invalid JSON or YAML
  (including YAML indentation errors)
- Built-in JSON ↔ YAML conversion
- A shareable link that encodes both inputs into the URL hash — no
  backend, the link itself carries the state
- Copy/export the diff as plain text or markdown

## Project structure

This is a Vite multi-page app. Each tool is a separate static HTML entry
point under its own folder, so routes map directly to folder paths with
no client-side router needed:

```
dev-toolkit/
├── index.html                  # homepage (tool list)
├── about/index.html            # /about/  (trust page, placeholder content)
├── privacy/index.html          # /privacy/ (trust page, placeholder content)
├── contact/index.html          # /contact/ (trust page, placeholder content)
├── shared/
│   └── trust-page.css          # shared shell styling for the pages above
├── json-yaml-diff/
│   ├── index.html              # /json-yaml-diff/
│   ├── main.ts                 # page wiring: DOM, event handlers
│   ├── codeEditor.ts           # CodeMirror 6 wrapper
│   ├── inputPanel.ts           # controls one input panel (editor + format toggle + convert)
│   ├── style.css
│   ├── diff/
│   │   ├── types.ts            # DiffNode tree + parse result types
│   │   ├── parseJson.ts        # JSON.parse wrapper with line/col errors
│   │   ├── parseYaml.ts        # js-yaml wrapper with line/col errors
│   │   ├── parseInput.ts       # dispatches to parseJson/parseYaml
│   │   ├── detectFormat.ts     # JSON-first auto-detection
│   │   ├── jsonDiff.ts         # the recursive structural diff itself
│   │   ├── renderDiff.ts       # renders a diff tree into the DOM
│   │   ├── exportDiff.ts       # renders a diff tree as text/markdown
│   │   └── convert.ts          # JSON <-> YAML string conversion
│   └── share/
│       └── urlState.ts         # encode/decode state into the URL hash (gzip + base64url)
└── vite.config.ts              # registers each page as a build entry
```

Adding a Phase 2 tool later = new folder + new entry in
`vite.config.ts`'s `rollupOptions.input`.

**Before applying for AdSense:** the About/Privacy/Contact pages still
have placeholder content in places — flesh these out before applying.
The contact email is real (`toolora.apps.support@gmail.com`).

## Requirements

- Node.js 18.19+ (or 20+)

## Local development

```bash
npm install
npm run dev       # starts Vite dev server, prints a local URL
npm run build     # type-checks with tsc, then builds static output to dist/
npm run preview   # serves the dist/ build locally, to sanity-check before deploy
```

## Deploying

Static output lands in `dist/`, with each page at its own path
(`dist/index.html`, `dist/json-yaml-diff/index.html`, etc.). This is
deployable as-is to Cloudflare Pages or Vercel:

- **Build command:** `npm run build`
- **Output directory:** `dist`

Connect the GitHub repo to Cloudflare Pages / Vercel for auto-deploy on
push to the main branch.

## Note on this dev machine's network

If `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or similar
TLS errors on this network, it's a local CA bundle quirk (not an actual
security-relevant MITM — verified via `openssl s_client`, the real
Google Trust Services cert is presented and validates fine). Workaround:

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

Set this in the shell before running `npm install` if needed.
