import { createRequire } from "node:module";

import { expect } from "vitest";

/**
 * axe-core harness for the jsdom component suite.
 *
 * Coverage limits are stated rather than implied:
 * - `color-contrast` cannot be evaluated under jsdom (no layout or paint), so
 *   it is disabled for every run and remains a manual token/contrast review.
 * - jsdom has no real viewport, so responsive behaviour is verified by
 *   `scripts/check-responsive.mjs` in a real browser, not here.
 *
 * No other rule is disabled globally: callers opt in explicitly and only for
 * a documented reason.
 */

const require = createRequire(import.meta.url);

interface AxeNode {
  target: unknown;
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: AxeNode[];
}

interface AxeResults {
  violations: AxeViolation[];
}

const axe = require("axe-core") as {
  run: (
    context: Element | Document,
    options?: Record<string, unknown>,
  ) => Promise<AxeResults>;
};

const JSDOM_LIMITATIONS = ["color-contrast"];

export async function expectNoA11yViolations(
  context: Element | Document,
  options: { alsoDisable?: string[] } = {},
): Promise<void> {
  const rules: Record<string, { enabled: boolean }> = {};
  for (const id of [...JSDOM_LIMITATIONS, ...(options.alsoDisable ?? [])]) {
    rules[id] = { enabled: false };
  }

  const results = await axe.run(context, {
    rules,
    resultTypes: ["violations"],
  });

  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help} — ${violation.nodes.length} node(s)`,
  );

  expect(summary, `axe violations:\n${summary.join("\n")}`).toEqual([]);
}
