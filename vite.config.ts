import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page setup: each tool (and the homepage) is a separate static HTML
// entry point. This keeps routing simple and conventional for a static site
// deployed with no server-side logic — Cloudflare Pages / Vercel serve each
// HTML file directly at its folder path.
const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        jsonYamlDiff: resolve(root, "json-yaml-diff/index.html"),
        jsonValidator: resolve(root, "json-validator/index.html"),
        yamlValidator: resolve(root, "yaml-validator/index.html"),
        about: resolve(root, "about/index.html"),
        privacy: resolve(root, "privacy/index.html"),
        contact: resolve(root, "contact/index.html"),
      },
    },
  },
});
