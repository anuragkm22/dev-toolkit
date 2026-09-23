import { defineConfig } from "vite";
import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";

// Multi-page setup: each tool and page has its own HTML entry point.
const root = import.meta.dirname;

export default defineConfig({
  plugins: [
    cloudflare(),
  ],

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