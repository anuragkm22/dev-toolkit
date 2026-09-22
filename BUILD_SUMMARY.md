# Dev Toolkit — Build Summary

Status: Phase 1 (flagship tool) + Phase 1e (SEO, analytics, two more
tools) functionally complete, verified locally. **Not yet deployed
anywhere.**

## Routes in this project

| Route | Purpose |
|---|---|
| `/` | Homepage — lists all three tools |
| `/json-yaml-diff/` | **Config Diff & Validator** — the flagship tool |
| `/json-validator/` | Single-input JSON validator |
| `/yaml-validator/` | Single-input YAML validator |
| `/about/` | Trust page, placeholder content |
| `/privacy/` | Trust page, discloses GA4 analytics |
| `/contact/` | Trust page, placeholder content (fake email, needs replacing) |
| `/robots.txt` | Allows all crawlers, points to sitemap |
| `/sitemap.xml` | Lists all 7 pages |
| `/og-image.png` | Shared social preview image (used by all pages' OG/Twitter tags) |

## What's built and verified

### Core diffing (Config Diff & Validator)
- Paste (or upload) two JSON or YAML blocks, get a structural diff —
  added / removed / changed / unchanged, color-coded, nested paths shown
- **Schema-aware**: object key reordering is ignored (diffing happens on
  parsed values, not raw text)
- **Format-tolerant**: `true`/`True`/`TRUE`, `1`/`1.0`, and quoted vs.
  unquoted strings are treated as equivalent when semantically the
  same — a quoted `"true"` string stays correctly distinct from the
  real boolean `true`
- Array diffing is by index (order matters for arrays, unlike object keys)

### Format handling
- Auto-detects JSON vs. YAML per input (valid JSON always wins under
  auto-detect)
- Manual **Auto / JSON / YAML** toggle per panel
- **Convert format** button — flips content between JSON and YAML in place
- **Open file** button — load a `.json`/`.yaml`/`.yml` file from disk.
  File extension forces the format toggle. Verified zero network
  requests — reads via the browser's local `FileReader` API only.

### Validation (all three tool pages)
- Invalid JSON or YAML reports the exact line and column of the error
- YAML indentation errors specifically are caught and localized
- Fixed a real bug this phase: modern Chrome's V8 engine changed its
  JSON error message format in ways the original line/column parser
  didn't handle, silently reporting "line 1, column 1" for some error
  types instead of the real location. Now handles all three V8 message
  shapes correctly (see "Bugs found and fixed" below).

### Standalone validators (new this phase)
- **`/json-validator/`** and **`/yaml-validator/`** — single-input
  pages for when you just need to check one file, not compare two.
  Reuse the exact same parsing/validation engine as the diff tool (no
  duplicated logic). Cross-linked from the diff tool and listed on the
  homepage.

### Sharing & export
- **Copy shareable link** — encodes both inputs into the URL's hash
  fragment (`#...`), gzip-compressed and base64url-encoded. Nothing is
  sent to a server; hash fragments never leave the browser.
- **Large-input protection** (new this phase): if the encoded link
  would exceed 2,048 characters — the universally-safe limit for
  sharing via Slack, email, SMS, etc. — the tool shows a clear error
  instead of silently handing back a fragile, oversized link. Tested
  against a real 82.5KB Kubernetes manifest, which produced an ~8,030
  character link; the tool correctly blocked it and suggested using
  "Copy as text" or sharing the files directly instead.
- **Copy as text** / **Copy as markdown** — for pasting into Slack, a
  PR description, or a terminal.

### SEO (new this phase)
- Every one of the 7 pages has a unique `<title>` and meta description
- Open Graph tags (title, description, image, url, type, site_name) and
  Twitter Card tags on every page, so sharing a link on Slack/Twitter/
  LinkedIn shows a proper preview card
- One shared OG image (`/og-image.png`) used across all pages
- `robots.txt` and `sitemap.xml` covering all 7 routes

### Analytics (new this phase)
- Google Analytics 4 (`gtag.js`) added to all 7 pages
- Verified: GA4 fires exactly one `page_view` request on page load;
  actually using any tool (pasting/diffing/validating) fires zero
  additional network requests — analytics tracks that you visited a
  page, never what you typed into a tool
- Privacy Policy updated to disclose this, including an opt-out link

### Editor & polish
- CodeMirror 6 for all input panels — syntax highlighting, line
  numbers, active-line highlighting
- Consistent visual design, card-based layout, responsive down to
  mobile widths
- Shared CSS/TS architecture: `shared/tool-page.css`, `shared/
  pageChrome.ts`, `shared/inputPanel.ts`, `shared/validatorPage.ts` are
  reused across all three tool pages rather than duplicated

### Deliberately out of scope
- **Plain text / arbitrary code diffing** (like Diffchecker's generic
  Text tab) — explicitly decided against, to stay focused on the
  JSON/YAML config-file wedge. Pasting non-structured text doesn't
  crash, but collapses to one before/after string rather than a real
  line diff — known, accepted limitation.
- No "saved diffs" history/accounts — would need a backend or
  persistent local storage, not in the original spec.
- Phase 2 tools (cron parser, SQL formatter, etc.) — not started.

## What to deploy

Deploy the **whole `dev-toolkit/` project as one static site**. `npm
run build` produces one `dist/` folder containing all 7 HTML pages plus
`robots.txt`, `sitemap.xml`, and `og-image.png` at the root. Cloudflare
Pages / Vercel serve this as a single multi-page site.

- **Build command:** `npm run build`
- **Output directory:** `dist`

## ⚠️ Placeholders that MUST be replaced before going live

1. **Domain**: every SEO tag (canonical, OG, Twitter, sitemap.xml,
   robots.txt) currently uses `https://dev-toolkit.example.com` as a
   placeholder. Once you have a real domain, this needs a global
   find-and-replace across:
   - `index.html`, `json-yaml-diff/index.html`, `json-validator/index.html`,
     `yaml-validator/index.html`, `about/index.html`, `privacy/index.html`,
     `contact/index.html`
   - `public/robots.txt`, `public/sitemap.xml`
2. **GA4 Measurement ID**: every page currently uses the placeholder
   `G-XXXXXXXXXX`. Create a GA4 property at
   [analytics.google.com](https://analytics.google.com) (Admin > Data
   Streams > your stream) to get a real Measurement ID, then replace
   `G-XXXXXXXXXX` in the same 7 HTML files listed above. Until replaced,
   the analytics script loads and even fires requests, but Google
   discards them since the ID isn't real — no data is currently being
   collected.
3. ~~**Contact email**~~ — done. `contact/index.html` now uses
   `toolora.apps.support@gmail.com`.
4. **Trust page content**: About/Privacy/Contact have placeholder or
   partially-placeholder copy — flesh out before applying to AdSense.

## Bugs found and fixed this session

1. Output toolbar's copy buttons showed even before any diff had run
   (CSS specificity issue with the `[hidden]` attribute).
2. "Convert format" permanently locked a panel out of "Auto" mode after
   one click, making repeated clicks look stuck on one format.
3. JSON error line/column reporting silently returned "line 1, column 1"
   for certain error types under modern Chrome's V8 engine, which
   changed its error message format. Now correctly handles all known
   V8 message shapes.
4. Shareable links had no size limit — a large real file would
   silently produce an ~8,000 character link with no warning. Now
   blocked with a clear error above 2,048 characters.

All four were caught via real browser testing (headless Chrome,
screenshots, simulated interactions, and — for #4 — an actual 82.5KB
test file), not just code review.

## Not yet done

- **Not deployed** — only runs locally (`npm run dev`) right now.
  Connecting GitHub + Cloudflare Pages/Vercel is on you, as agreed.
- **No git commits** — nothing has been committed this session, per
  instruction to only commit when explicitly asked.
- **No custom domain, no AdSense application** yet.
- See the placeholders list above — several things need real values
  before this can go live for real users.
