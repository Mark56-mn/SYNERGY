import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "packages/*/test/**/*.test.ts",
      "web/tests/**/*.test.ts",
    ],
  },
});
