#!/usr/bin/env node
/**
 * ADR-0006 import-boundary check for the web app:
 *
 *   1. Client-reachable code (src/app pages/components, src/components, src/lib)
 *      must not import anything from src/server/** — server-only code never
 *      reaches the client bundle (the `server-only` marker enforces this at
 *      build time as well; this check catches it in review).
 *   2. Cross-module access goes through a module's PUBLIC service: a file in
 *      src/modules/<a>/** must not deep-import another module's internals
 *      (anything under src/modules/<b>/ that is not the module's public entry).
 *
 * Exit code 1 on any violation (ADR-0008 evidence contract).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const webRoot = "web";
const srcRoot = path.join(webRoot, "src");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(srcRoot).filter((f) => !f.includes("next-env.d.ts"));
const violations = [];

const SERVER_SIGILER = /(from\s+["'].*src\/server|from\s+["']@\/server\/)/;

for (const file of files) {
  const rel = path.relative(srcRoot, file);
  const code = fs.readFileSync(file, "utf8");

  // Rule 1: no server imports from client-reachable layers.
  const inClientLayer =
    rel.startsWith("app/") ||
    rel.startsWith("components/") ||
    rel.startsWith("lib/");
  // app/api routes are server code by definition — they are NOT client-reachable.
  const isApiRoute = rel.startsWith("app/api/");
  if (inClientLayer && !isApiRoute && SERVER_SIGILER.test(code)) {
    violations.push(
      `${rel}: client-layer file imports server-only code (ADR-0006).`,
    );
  }

  // Rule 2: cross-module deep imports.
  const modMatch = rel.match(/^modules\/([^/]+)\//);
  if (modMatch) {
    const ownModule = modMatch[1];
    const crossDeep =
      /from\s+["'].+?modules\/([^/'"]+)\/(?!service\.ts|index\.ts)/g;
    // Internal-to-own-module relative references are fine.
    const importLine = /(?:from\s+|import\s*)["']([^"']+)["']/g;
    let m;
    while ((m = importLine.exec(code)) !== null) {
      const spec = m[1];
      const other = spec.match(/modules\/([^/'"]+)\//);
      if (other && other[1] !== ownModule) {
        violations.push(
          `${rel}: deep import into module "${other[1]}" — use its public service (ADR-0006).`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) console.error(`import-boundaries: ${v}`);
  console.error(`import-boundaries: ${violations.length} violation(s).`);
  process.exit(1);
}
console.log(`import-boundaries: clean (${files.length} files checked).`);
