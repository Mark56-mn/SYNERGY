import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * TASK-006C — user-facing-source location-branding regression scan.
 *
 * SYNERGY is a general Nigeria-first platform. City-specific demo content
 * (Ibadan, Bodija, …) was reported still visible after a de-branding pass,
 * so this test scans every user-facing source tree (web app, Android app,
 * shared packages, repo scripts) for those strings to stop them silently
 * returning.
 *
 * Deliberately NOT scanned (historical / normative records, not product
 * surface): MASTER_BLUEPRINT.md, DECISION_REGISTER.md, docs/**, task/**,
 * handoff/**. Those retain "Ibadan" as the CONFIRMED controlled launch
 * market (D-001) and as historical record; rewriting them would falsify
 * the decision history. This test file itself contains the words in its
 * pattern and is not part of the scanned trees.
 */

const FORBIDDEN = [
  "Ibadan",
  "Bodija",
  "Dugbe",
  "Akobo",
  "Jericho",
  "Ring Road",
];

const SCAN_ROOTS = ["web/src", "android/app", "packages", "scripts"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs|jsx|json|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("no location-specific product branding", () => {
  it("finds no forbidden city/neighbourhood strings in user-facing sources", () => {
    const hits: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const file of walk(root)) {
        const text = readFileSync(file, "utf8");
        for (const word of FORBIDDEN) {
          if (new RegExp(word, "i").test(text)) {
            hits.push(`${file} contains "${word}"`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
