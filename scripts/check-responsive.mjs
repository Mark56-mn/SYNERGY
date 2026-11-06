#!/usr/bin/env node
/**
 * Responsive regression check (TASK-005).
 *
 * Runs the TASK-004 surfaces in a REAL browser at the breakpoints the shell
 * behaves differently at, and fails on layout regressions a DOM-only test
 * cannot see: horizontal overflow, missing/duplicated navigation, content
 * sitting under the fixed bottom bar, clipped tab labels and an oversized
 * dialog.
 *
 * Playwright is intentionally NOT a project dependency (a browser download is
 * ~126 MB and this repo has no CI — G-5). Install it out of tree and point
 * NODE_PATH at it:
 *
 *   npm install --prefix /tmp/qa playwright && npx --prefix /tmp/qa playwright install chromium
 *   npm run dev                      # in another terminal (port 3000)
 *   NODE_PATH=/tmp/qa/node_modules npm run check:responsive
 *
 * Exit codes: 0 all checks passed · 1 regression found · 2 Playwright or the
 * dev server is unavailable (reported, never silently treated as a pass).
 */
import { createRequire } from "node:module";
import process from "node:process";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";

const VIEWPORTS = [
  { width: 360, height: 800, name: "mobile-360" },
  { width: 414, height: 896, name: "mobile-414" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 1024, height: 768, name: "laptop-1024" },
  { width: 1280, height: 800, name: "desktop-1280" },
  { width: 1440, height: 900, name: "desktop-1440" },
];

const PAGES = [
  { path: "/", name: "home" },
  { path: "/discover", name: "discover" },
  { path: "/u/amara.makes", name: "profile" },
  { path: "/b/bola.homefix", name: "business" },
  { path: "/communities", name: "communities" },
  { path: "/communities/bodija-traders", name: "community" },
];

/**
 * Resolve Playwright from a normal install, an out-of-tree path
 * (PLAYWRIGHT_PACKAGE) or NODE_PATH. `require` is tried first because
 * NODE_PATH is not consulted by dynamic `import()`.
 */
async function loadChromium() {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_PACKAGE, "playwright"].filter(
    Boolean,
  );
  for (const specifier of candidates) {
    try {
      const loaded = require(specifier);
      if (loaded?.chromium) return loaded.chromium;
    } catch {
      // Fall through to the ESM attempt.
    }
    try {
      const loaded = await import(specifier);
      if (loaded?.chromium) return loaded.chromium;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function main() {
  const chromium = await loadChromium();
  if (!chromium) {
    console.error(
      "check:responsive: Playwright is not available. Install it out of tree " +
        "(see the header of scripts/check-responsive.mjs) and re-run with NODE_PATH set. " +
        "This is a NOT RUN result, not a pass.",
    );
    process.exit(2);
  }

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const failures = [];
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text().slice(0, 160));
    }
  });
  page.on("pageerror", (error) =>
    consoleErrors.push(`pageerror: ${String(error).slice(0, 160)}`),
  );

  try {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      for (const target of PAGES) {
        await page.goto(`${BASE_URL}${target.path}`, {
          waitUntil: "networkidle",
        });
        const metrics = await page.evaluate(() => {
          const nav = document.querySelector(
            'nav[aria-label="Primary (mobile)"]',
          );
          const navVisible = nav
            ? getComputedStyle(nav).display !== "none"
            : false;
          const navHeight = navVisible
            ? Math.round(nav.getBoundingClientRect().height)
            : 0;
          const main = document.querySelector("main");
          const tabs = [...document.querySelectorAll('[role="tab"]')];
          return {
            overflow:
              document.documentElement.scrollWidth > window.innerWidth + 1,
            navVisible,
            navHeight,
            mainPadBottom: main
              ? Math.round(parseFloat(getComputedStyle(main).paddingBottom))
              : 0,
            clippedTabs: tabs.filter(
              (tab) =>
                tab.getBoundingClientRect().right > window.innerWidth + 1,
            ).length,
            contentWidth: main
              ? Math.round(main.getBoundingClientRect().width)
              : 0,
          };
        });

        const expectedNav = viewport.width < 1024;
        const label = `${viewport.name} ${target.name}`;
        if (metrics.overflow) failures.push(`${label}: horizontal overflow`);
        if (metrics.navVisible !== expectedNav) {
          failures.push(
            `${label}: bottom nav visible=${metrics.navVisible}, expected ${expectedNav}`,
          );
        }
        if (
          metrics.navVisible &&
          metrics.mainPadBottom < metrics.navHeight - 1
        ) {
          failures.push(
            `${label}: content padding ${metrics.mainPadBottom}px < nav ${metrics.navHeight}px`,
          );
        }
        if (metrics.clippedTabs > 0) {
          failures.push(
            `${label}: ${metrics.clippedTabs} tab label(s) clipped`,
          );
        }
        if (viewport.width >= 1280 && metrics.contentWidth > 700) {
          failures.push(
            `${label}: content column ${metrics.contentWidth}px exceeds the 42rem column`,
          );
        }
      }
    }

    // Dialog sizing at the smallest and largest viewports.
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[VIEWPORTS.length - 1]]) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      const trigger = page.getByRole("button", { name: /^create/i }).first();
      if ((await trigger.count()) === 0) {
        failures.push(`${viewport.name}: composer trigger missing`);
        continue;
      }
      await trigger.click();
      await page.waitForSelector('[role="dialog"]');
      const dialog = await page.evaluate(() => {
        const element = document.querySelector('[role="dialog"]');
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          withinViewport:
            rect.left >= -1 &&
            rect.right <= window.innerWidth + 1 &&
            rect.bottom <= window.innerHeight + 1,
        };
      });
      if (!dialog) failures.push(`${viewport.name}: dialog did not open`);
      else if (!dialog.withinViewport) {
        failures.push(
          `${viewport.name}: dialog ${dialog.width}x${dialog.height} exceeds the viewport`,
        );
      }
      await page.keyboard.press("Escape");
    }
  } finally {
    await browser.close();
  }

  if (consoleErrors.length > 0) {
    failures.push(
      `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join(" | ")}`,
    );
  }

  if (failures.length > 0) {
    for (const failure of failures)
      console.error(`check:responsive: FAIL ${failure}`);
    console.error(`check:responsive: ${failures.length} regression(s).`);
    process.exit(1);
  }

  console.log(
    `check:responsive: clean (${VIEWPORTS.length} viewports × ${PAGES.length} pages + dialog checks).`,
  );
}

main().catch((error) => {
  console.error("check:responsive: crashed:", error);
  process.exit(2);
});
