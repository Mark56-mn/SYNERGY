import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // UI tests are .tsx and use the automatic JSX runtime (no React import).
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  resolve: {
    alias: [
      // Web app path aliases under test.
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, "web/src/$1") },
      {
        find: /^server-only$/,
        replacement: path.resolve(
          __dirname,
          "scripts/test-stubs/server-only.mjs",
        ),
      },
    ],
  },
  test: {
    // Node by default (security/domain suites); UI suites opt into jsdom with
    // a per-file `@vitest-environment jsdom` docblock.
    environment: "node",
    include: [
      "tests/**/*.test.{ts,tsx}",
      "packages/*/test/**/*.test.{ts,tsx}",
      "web/tests/**/*.test.{ts,tsx}",
    ],
  },
});
