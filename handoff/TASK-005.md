# TASK-005 — Quality, accessibility and security gate extension — Handoff

Status: **DONE** (verification system extended; no product, identity, database or deployment work)
Branch: `chore/autonomous-foundation-v1`
Starting commit: `10e97903a68f86937bf7afd5cb9de2dbd861ec91` (TASK-004 tip, verified local == remote)
Authorised by: MISSION 02 (owner), continuation after TASK-004.

---

## 1. Objective and what changed

TASK-003 left dependency advisories unresolved and no automated accessibility check; TASK-004 left responsive review as a manual exercise. This task turned both into repeatable gates and extended the server-boundary suite, without touching product behaviour.

Added:

- **Automated accessibility testing** (`axe-core` 4.14.0) across the shell, feed, discovery, profiles, communities, video, states and dialog.
- **Responsive regression gate** (`scripts/check-responsive.mjs`) that runs the real surfaces in a real browser at six widths.
- **Nine new server-boundary tests** (rate limiting through the route wrapper, mass assignment, role denial, safe error bodies).
- **Aggregate verification** (`npm run verify`) that fails on any required gate and reports the audit separately.
- **One targeted dependency remediation** (`postcss`), plus a complete re-triage of the remaining advisories.
- **Two real accessibility defects fixed** (heading order; duplicate landmark names), found by the new axe tests.

Not changed: no UI redesign, no new tokens, no auth, no schema, no messaging, no payments, no deployment, no CI.

## 2. Test architecture review

| Area | Before | Assessment | TASK-005 action |
| --- | --- | --- | --- |
| Vitest config | Node env by default, jsdom per-file, `@/` alias, `server-only` stub | Sound; component tests already isolated per file | Reused unchanged |
| Server boundary tests | `auth-boundaries`, `session`, `authz`, `env`, `logging`, `ratelimit` | Good coverage of deny-by-default, validation order, redaction | Extended with route-level limiter, mass assignment and role cases |
| Domain contracts | `packages/domain/test/contracts.test.ts` | Adequate for current scope | Untouched |
| UI tests | Tabs, dialog, post card, discovery, demo content | Behaviour-focused, no snapshot noise | Added axe suite over the same surfaces |
| Secret scan | Tracked-blob scan, credential-shaped patterns | Works, no false positives now | Reviewed; no change needed |
| Import boundaries | Client→server and cross-module deep imports | Effective (45 files) | Reviewed; no change needed |
| Accessibility | None automated | Gap | axe-core suite added |
| Responsive | Manual (TASK-004 screenshots) | Not repeatable | Browser checker added |

No duplicate tests were added: the new security cases exercise paths the existing suite did not (limiter inside the wrapper, extra body fields, role helpers, token echo).

## 3. Automated accessibility testing

- **Tool**: `axe-core@4.14.0` (Deque, Apache-2.0, dev-only, no runtime cost) driven through a small documented helper `tests/support/axe.ts`. No `vitest-axe` wrapper was added — the helper is ~60 lines and avoids another dependency.
- **Suites** (`tests/a11y/accessibility.test.tsx`, 8 tests): application shell + navigation, feed (post cards, media labels, tabs), discovery (search, tab strip, result cards), business profile with listings, community card with disabled join, video presentation, loading/empty/error states, open dialog.
- **Documented limits**: `color-contrast` is disabled for every run because jsdom has no layout or paint — it cannot be evaluated there. Contrast therefore remains a manual token review (TASK-004 §9) and is **not** claimed as automated. Every other axe rule stays enabled; `region` and heading rules are exercised by rendering each surface inside the `main` + `h1` structure a real page provides rather than by switching rules off. No violation is suppressed globally.

**Real defects found and fixed:**

1. **Heading order** — `/discover` and `/communities` jumped from `h1` to card `h3`s. Added a section heading in the discovery results panel (per category, screen-reader only) and a `Community directory` heading on the communities index. Document outline is now `h1 → h2 → h3` on both pages.
2. **Duplicate landmark names** — the desktop sidebar navigation and the mobile bottom bar both exposed `aria-label="Primary"`, so the two landmarks were announced identically. The bottom bar is now `Primary (mobile)` and the sidebar `aside` is labelled `Sidebar`.

## 4. Responsive regression coverage

`npm run check:responsive` → `scripts/check-responsive.mjs`. Checks, at **360×800, 414×896, 768×1024, 1024×768, 1280×800, 1440×900**, across **`/`, `/discover`, `/u/amara.makes`, `/b/bola.homefix`, `/communities`, `/communities/bodija-traders`**:

- no horizontal overflow (`scrollWidth ≤ innerWidth`);
- bottom navigation visible below `lg` and absent at/above `1024`;
- `main` bottom padding clears the fixed bar whenever it is visible;
- no tab label clipped outside the viewport;
- the content column stays at the 42rem width on wide screens;
- no console or page errors;
- composer dialog opens, stays inside the viewport, and closes (checked at 360 and 1440).

**Result: `check:responsive: clean (6 viewports × 6 pages + dialog checks)`, exit 0** — run against the local dev server with Playwright installed out of tree (see §11 for why it is not a project dependency).

## 5. Security tests added

`tests/security-hardening.test.ts` (9 tests), extending — not replacing — the TASK-003 suite. Same labelled `TestSessionSource` double; **these prove boundary behaviour, not production authentication** (which still needs G-2 and TASK-006A).

| Behaviour | Assertion |
| --- | --- |
| Route-level rate limit | A limited route returns `429 rate_limited` and the handler runs once, never on the denied call |
| Limiter isolation | Exhausting identity A leaves identity B allowed through the route |
| No persistence on invalid input | A `400` leaves the owner's list unchanged |
| Mass assignment | Body fields `ownerId`, `owner_id`, `roles`, `isAdmin` do not change attribution or grant roles |
| Forged query identity | `?user_id=<other>` returns only the caller's items |
| Role denial | No session → `unauthorized`; `member` on a `moderator`-required action → `forbidden` |
| Error-body hygiene | `401` body never echoes the presented token or any user id |
| Malformed but valid JSON | `null` body → `400 bad_request`, no crash |

## 6. Dependency triage (re-evaluated, not assumed)

`npm audit` re-run on this tree. After the remediation below: **19 affected packages — 2 critical, 3 high, 14 moderate. `npm audit` exit 1 (not a pass).**

**Fixed in TASK-005 (safe, verified):** `postcss`.

- Added a single npm `overrides` entry `postcss: ^8.5.32`. Next 15 pinned the vulnerable `postcss@8.4.31`; the override resolves every consumer to `8.5.32` (patched for the four `sourceMappingURL`/stringify advisories), including `next`, `tailwindcss`, `autoprefixer` and `@expo/metro-config`.
- Verified rather than assumed: `npm install` 0, dependency tree intact (`styled-jsx` and `@swc/helpers` present), `npm test` 72 passing, `npm run build` 0. Advisory count dropped **21 → 19** and high **4 → 3**.
- This is deliberately a **single** override: TASK-003's attempt to combine several overrides produced an incomplete tree, and that failure is why this one was tested in isolation.

**Remaining families (all documented, no unsafe change applied):**

| Package | Severity | Scope | Vulnerable range | Fix available | Decision |
| --- | --- | --- | --- | --- | --- |
| `vitest`, `tinypool`, `@vitest/mocker` | critical (2) + moderate (1) | Dev/test tooling only (`GHSA-5gmw-xhrv-c9v3`, `GHSA-85c8-ppgw-ccpr`, `GHSA-82fw-gwwq-j7x9`, `GHSA-qxg6-89mg-rqv8`) | vitest `0.0.95–4.1.10`, tinypool `≤2.1.1` | `vitest@5.1.0` — **breaking major** | Deferred to owner (B-5). No production runtime exposure. |
| `expo-router`, `query-string`, `decode-uri-component` | high (3) | Android runtime/bundling (`GHSA-vcc3-ghjq-m6fr`, `GHSA-qr28-fpjm-wq7f`) | ≤ 58.0.12 | `expo-router@58` — **SDK 58 major** | Deferred (B-5); Android feature work is not started, so exposure is the foundation shell only. |
| `expo`, `@expo/fingerprint`, `glob`, `minimatch` | moderate (4+) | Expo CLI/bundling (`GHSA-3g3m-2fjr-6pw4`, `GHSA-g3hv-75wg-m249`) | varies | `expo@53`/SDK 58 — **major** | Deferred (B-5). |
| `drizzle-kit`, `esbuild`, `@esbuild-kit/*` | moderate (4) | Dev migration tooling (`GHSA-67mh-4wv8-2f99`) | esbuild `≤0.24.2` | `drizzle-kit@0.18` — **downgrade** | Deferred; no schema or migrations exist yet. |
| `@typescript-eslint/*` (5) | moderate (5) | Lint tooling (`minimatch` chain) | `≥6.16.0` | `fix=true` in audit, but no resolution applied by `npm audit fix` under the current `eslint-config-next` pin | Investigated: `npm audit fix` (non-force) changed nothing; forcing it would alter the lint stack. Documented for B-5. |

What was **not** done, deliberately: no `npm audit fix --force`, no framework majors (Next 16, Vitest 5, Expo SDK 58), no suppression of findings, no removal of packages or tests to make the report green, and no downgrade that would remove capability.

## 7. Quality gates and aggregate verification

- `npm run verify` (`scripts/verify.mjs`) runs, in order and with inherited output: `format:check`, `lint`, `typecheck`, `test`, `build`, `secret-scan`, `check:boundaries`. It exits **1** if any required gate fails and prints a PASS/FAIL summary with durations.
- `npm audit --audit-level=high` runs **after** the required gates and is labelled `ADVISORY`, never `PASS`, because the remaining advisories need an owner decision. `npm run verify -- --strict-audit` makes it a hard failure for anyone who wants that.
- Neither gate hides output: child processes inherit stdio, and no exit code is piped or swallowed.

## 8. Gate evidence (final tree)

| Gate | Command | Exit | Result |
| --- | --- | --- | --- |
| Install + lockfile | `npm install` (after override) | 0 | Tree intact, `styled-jsx`/`@swc/helpers` present |
| Formatting | `npm run format:check` | 0 | Clean |
| Lint | `npm run lint` | 0 | 0 errors, 0 warnings |
| Typecheck | `npm run typecheck` | 0 | All workspaces |
| Unit + component tests | `npm test` | 0 | **13 files, 72 tests passed** (was 11 / 55) |
| Accessibility | `npm test` (axe suites) | 0 | 8 axe tests, 0 violations after 2 fixes; `color-contrast` not evaluable in jsdom |
| Responsive | `npm run check:responsive` | 0 | 6 viewports × 6 pages + dialog, clean |
| Web production build | `npm run build` | 0 | All routes prerendered |
| Secret scan | `npm run secret-scan` | 0 | Clean (tracked files) |
| Import boundaries | `npm run check:boundaries` | 0 | Clean |
| Dependency audit | `npm audit` | **1** | 19 affected packages: 2 critical, 3 high, 14 moderate (§6) |
| Aggregate | `npm run verify` | 0 | All required gates pass; audit reported as ADVISORY |
| Android typecheck | `npm run android:typecheck` | 0 | Unchanged Expo foundation |
| Android Metro export | `npx expo export --platform android` | 0 | Ran in TASK-003; not re-run here (no Android source changed) |

## 9. Test quality review

Reviewed all suites for weak or misleading tests. Findings and actions:

- Existing server tests were already behaviour-focused (status codes, attacker-controlled fields, redaction), not implementation-shaped. Kept intact.
- New security tests assert observable outcomes (status, body, repository state) rather than internal calls, except one deliberate `handler` spy proving the limiter short-circuits execution.
- New axe tests assert the **absence of violations by rule id**, not snapshots, so they fail for real defects and stay readable.
- No timing-dependent tests were added; the only clock use is the injectable `now` already used by the limiter.
- No test depends on a real credential, network call or external service.
- No existing assertion was weakened, skipped or deleted.

## 10. Documentation consistency corrected

`handoff/CURRENT_STATUS.md` still described the product as having "no feed… messaging UI" after TASK-004 shipped a demo feed. It now separates four levels explicitly: implemented presentation, local-only interactions, demo content, and backend functionality that does not exist. Video is described as presentation only, an unsaved like as a local toggle, and every disabled control as unavailable — none of it as working backend behaviour.

`QUALITY_GATES.md` gained the implemented-gates section (commands, evidence location, documented gaps); `ROADMAP.md` and `handoff/README.md` were updated to match.

## 11. Limitations and environmental notes

1. **Playwright is not a project dependency.** A browser download is ~126 MB, there is no CI (G-5), and the task forbids a large stack without justification. `check:responsive` therefore reports `NOT RUN` (exit 2) with install instructions when Playwright is absent; it never reports a skip as a pass. It was executed here with an out-of-tree install (`NODE_PATH`) and passed.
2. **Automated contrast is not covered.** jsdom cannot evaluate `color-contrast`; the rule is disabled with that reason recorded. This is not a WCAG certification — it is the automated subset above.
3. **Audit remains red** by design of the dependency graph, not by oversight: the critical and high findings need breaking majors owned by B-5.
4. **`next build` invalidates a running `next dev`** in the same `.next` directory (observed as broken RSC payloads and unloaded CSS). Restart the dev server before browser checks; this bit during the first responsive run and is recorded here so it is not rediscovered.
5. Identity remains unverified: `SupabaseSessionSource.verify()` still returns `null` until G-2.

## 12. Next recommended task

**Identity and profile persistence slice** (roadmap Phase 1, item 6) once B-3 provisioning exists — it is the first task that turns demo surfaces into real data and should reuse this verification system (axe suite, responsive gate, boundary tests) as its definition of done. If provisioning is still blocked, the next useful increment is extending coverage to the API routes that will be added with identity, not building more infrastructure.

Open owner decisions: B-3 (provisioning), B-4 (CI, unchanged G-5), B-5 (dependency majors: Vitest 5, Expo SDK 58, Next 16).
