# TASK-003 — Application foundation — Handoff

Status: **DONE** (foundation only; no product features beyond the shell, no deployment, no merge)
Branch: `chore/autonomous-foundation-v1`
Base commit: `3ce42e6897072c916e86e2bbeb333856c2813410`
Foundation commits on this branch: `6933820` (root tooling + shared packages + db boundary), `388d3fe` (web + tests), `3657c60` (android). This handoff file lands in the documentation commit that contains it — see `git log --oneline -4` on the branch for the tip.
Authorised by: MISSION 02 (owner), which approved G-1 for the application-foundation phase and explicitly authorised a separate Android foundation.

---

## 1. Objective and scope

**In scope (done):** a real, runnable, testable monorepo foundation for web + Android with shared contracts, a server-side security boundary, and local quality gates with recorded evidence.

**Out of scope (deliberately not done):** product features (feed, listings, bookings, moderation), provider provisioning (Neon / Supabase / Cloudinary), live credentials, deployment, payments, CI platform (G-5), merge into `main`, and TASK-004.

Framework/tooling selections were pinned **before** installing dependencies and recorded in `docs/adr/0012-android-application-foundation.md`, `docs/adr/0013-scaffold-implementation-tooling.md` and `docs/adr/0014-slash-updates.md` (committed earlier on this branch).

## 2. What was implemented

- **Monorepo**: npm workspaces `packages/*`, `web`, `android`; TypeScript strict base config; Prettier, ESLint (flat config), Vitest at the root.
- **Shared `packages/domain`**: Zod + TypeScript contracts for users/profiles, providers, communities, content, listings (media caps from confirmed D-007: 3 images / 2 videos), bookings (state enum per D-005) and messaging (`PREHIRE_MESSAGE_CAP = 10` per D-006).
- **Shared `packages/design-tokens`**: single source of colour/radius/spacing/typography tokens (dark navy + mint) consumed by web and Android.
- **Web (`web/`)**: Next.js App Router shell, PWA manifest route, per-surface placeholder pages, design-token-driven UI primitives (`Button`, `Card`, `Badge`, state components), health endpoint.
- **Server security boundary (`web/src/server/`)**: Zod env loader (environment-aware, fail-fast, names-only errors, lazy), session model with a `SessionSource` interface plus a Supabase path that refuses to pretend verification, deny-by-default `requireAuthenticatedUser` / `requireOwnership` / `requireRole`, uniform JSON route wrapper (validation → session → rate limit → handler → safe error mapping), redacting structured logger, in-memory rate limiter, typed `AppError`s.
- **Domain modules (`web/src/modules/*`)**: inventory, listing, community, booking, messaging — each with a public service that insists on a verified session and ownership before persistence.
- **API routes (`web/src/app/api/v1/`)**: `health` (public, no user data) and user-scoped `owned-items`, `inventory`, `listing`, `booking`, `messaging`, all wrapped by the same handler; none accept a caller-supplied user ID.
- **Database boundary (`db/`)**: drizzle-kit config + README. **No tables and no migrations** — the identity slice owns the first ones.
- **Android (`android/`)**: Expo SDK 57 + Expo Router, five-tab navigation shell, monorepo-aware Metro config, tab placeholder screens, and an honest README stating it is a foundation and not store-ready.
- **Quality scripts**: `scripts/secret-scan.mjs` (tracked-file credential scan), `scripts/check-import-boundaries.mjs` (client code may not import `src/server`), `scripts/test-stubs/server-only.mjs` (test double for the `server-only` marker).
- **Repo hygiene**: `.gitignore`, `.prettierignore` (owner docs and planning records are never auto-reformatted), `.env.example` with **names only**.

## 3. Important file paths

| Path | Role |
| --- | --- |
| `package.json`, `package-lock.json` | Workspaces, scripts, pinned tool versions |
| `tsconfig.base.json`, `vitest.config.ts`, `.prettierignore`, `.gitignore`, `.env.example` | Root tooling and hygiene |
| `packages/domain/src/*.ts`, `packages/domain/test/contracts.test.ts` | Shared contracts + contract tests |
| `packages/design-tokens/src/index.ts`, `tokens.css` | Design tokens |
| `web/src/app/layout.tsx`, `page.tsx`, `manifest.ts` | Shell, landing surface, PWA manifest |
| `web/src/components/ui/*` | UI primitives (`Button`, `Card`, `Badge`, `States`) |
| `web/src/server/env.ts` | Environment validation |
| `web/src/server/auth/session.ts`, `web/src/server/provider-access.ts` | Session model, session source, Supabase path |
| `web/src/server/authz/index.ts` | Deny-by-default authorisation helpers |
| `web/src/server/http/handler.ts`, `errors.ts` | Uniform route wrapper, safe errors |
| `web/src/server/logging.ts`, `ratelimit.ts` | Redacting logger, limiter |
| `web/src/modules/{example-owned-resource,inventory,listing,community,booking,messaging}/service.ts` | Domain services enforcing ownership |
| `web/src/app/api/v1/*/route.ts` | API routes |
| `tests/*.test.ts` | Security, env, session, rate-limit, logging, import-boundary tests |
| `db/drizzle.config.ts`, `db/README.md` | Migration boundary |
| `android/app/_layout.tsx`, `android/app/(tabs)/*`, `android/metro.config.js` | Android shell + Metro monorepo wiring |
| `scripts/secret-scan.mjs`, `scripts/check-import-boundaries.mjs` | Quality gates |

## 4. Web architecture

Modular monolith (ADR-0006): `app/` is the thin route layer; `modules/<domain>/` owns its service and (later) its schema; `server/` is server-only infrastructure; `components/ui/` holds token-driven primitives; `lib/` is pure utilities. Every mutation route is composed by `createApiRoute`, so validation, session resolution, rate limiting, logging and error mapping cannot drift between endpoints. `server-only` markers plus `check:boundaries` prevent server code reaching the client bundle.

## 5. Android architecture

Expo SDK 57 + Expo Router (file-based) with a five-tab shell mirroring the web surfaces. `metro.config.js` watches the monorepo root and resolves workspace packages, so `@synergy/domain` and `@synergy/design-tokens` are consumed directly with no copy step. No secrets in `app.json`. Environment handling is intentionally minimal: the foundation reads no runtime configuration, and no identity path exists client-side (identity will be Supabase Auth via the shared server boundary pattern).

## 6. Shared packages

`@synergy/domain` is pure TypeScript + Zod (no React, no Node APIs) so both clients validate the same shapes; `@synergy/design-tokens` exports typed constants plus CSS custom properties for web. Contract tests assert the confirmed caps/enums (media limits, booking states, pre-hire message cap) so the shared layer cannot silently drift from the decision register.

## 7. Authentication and authorisation boundaries (security review)

| Requirement | How it is enforced | Evidence |
| --- | --- | --- |
| Auth verified server-side | `SessionSource.getSession(request)` derives identity from the request's bearer token server-side; routes receive only `Session \| null` | `tests/session.test.ts`, `tests/auth-boundaries.test.ts` |
| Browser-supplied user ID never trusted | No route or service accepts a user/owner ID from the body; creator identity always comes from the verified session | `tests/auth-boundaries.test.ts` (greps + behavioural: forged `user_id` in body ignored) |
| Protected routes deny unauthenticated access | `requireAuthenticatedUser` throws `unauthorized` on `null`; every user-scoped route/service calls it before persistence | `tests/authz.test.ts`, `tests/auth-boundaries.test.ts` |
| Ownership enforced | `requireOwnership(session, ownerId)`; services compare the session user ID with the stored owner | `tests/auth-boundaries.test.ts` (user A cannot read/delete user B) |
| Role checks | `requireRole(session, roles)` reads roles only from the verified session; unknown/absent roles deny | `tests/authz.test.ts` |
| Cross-user isolation | Repository methods are owner-scoped; list endpoints return only the caller's rows | `tests/auth-boundaries.test.ts` |
| Input validation before DB | `createApiRoute` parses with Zod and returns field **names** only on failure; handlers never see raw input | `tests/auth-boundaries.test.ts` (invalid payload rejected before persistence) |
| Errors do not leak secrets | `AppError` → safe body; unexpected errors → generic 500 and redacted server-side log | `tests/auth-boundaries.test.ts`, `tests/logging.test.ts` |
| Server-only deps cannot enter the browser bundle | `import "server-only"` + `check:boundaries` script | `npm run check:boundaries` (22 files, clean) |
| Env validation does not block unrelated commands | `getEnv()` is lazy (never at import), development runs without providers; staging/production fail fast | `tests/env.test.ts` (5 cases), `npm run build` with no env vars set |
| Logging does not expose private data | Recursive redaction of credentials/PII keys; structural IDs preserved | `tests/logging.test.ts` (5 cases) |

**Honest limitations:** the security tests use labelled test doubles for the session source ("NOT production security"). `SupabaseSessionSource.verify()` deliberately returns `null` — real token verification cannot be implemented or verified until G-2 provisioning and TASK-006A. The tests prove the *boundary logic* (deny-by-default, ownership, isolation, validation order, redaction), not the identity provider.

## 8. Dependency audit findings

Original audit (fresh install, before any remediation): **21 affected packages in 7 advisory families — 2 critical, 4 high, 15 moderate.** `npm audit` exit status **1** (not a pass).

| # | Package(s) | Installed | Severity | Direct? | Path | Affects | Remediation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `vitest`, `@vitest/mocker`, `tinypool` (`GHSA-5gmw-xhrv-c9v3`, `GHSA-85c8-ppgw-ccpr`, `GHSA-82fw-gwwq-j7x9`, `GHSA-qxg6-89mg-rqv8`) | 3.2.7 / nested | critical | no / no | `vitest` → `@vitest/mocker`, `tinypool` | Development test tooling only | `vitest@5.1.0` — **breaking major**; deferred for decision (no shipped runtime exposure) |
| 2 | `postcss` (`GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849`) | 8.4.31 (pinned by next) | high | no | `next` → `postcss` | Build-time CSS tooling | `postcss@^8.5.32` override (same major) or `next@16.4.5` (**breaking major**) |
| 3 | `decode-uri-component` → `query-string` → `expo-router` (`GHSA-vcc3-ghjq-m6fr`, `GHSA-qr28-fpjm-wq7f`) | 0.2.2 / 7.1.3 | high | no / no / **yes** | `expo-router` → `query-string` → `decode-uri-component` | Android bundling/runtime path (DoS on malformed input) | `expo-router@58` (**SDK 58, breaking**) or `decode-uri-component@^0.5.1` override |
| 4 | `glob` (`GHSA-3g3m-2fjr-6pw4`) | 13.0.7 (nested) | moderate | no | `expo` → `@expo/fingerprint` → `glob` | Expo CLI tooling | `glob@^14.0.4` override or SDK 58 |
| 5 | `minimatch` (`GHSA-g3hv-75wg-m249`) | 10.2.6 / 3.1.5 | moderate | no | `glob`, `@typescript-eslint/typescript-estree` | Tooling only | `minimatch@^11.0.5` override or upstream bumps |
| 6 | `esbuild` → `@esbuild-kit/*` → `drizzle-kit` (`GHSA-67mh-4wv8-2f99`) | 0.18.20 (nested) | moderate | no / no / **yes** | `drizzle-kit` → `@esbuild-kit/core-utils` → `esbuild` | Dev migration tooling only | `esbuild@^0.28.2` override (tested compatible with `drizzle-kit generate`) |
| 7 | `@typescript-eslint/{parser,utils,type-utils,typescript-estree,eslint-plugin}` | 8.72.1 | moderate | no | via `minimatch` | Lint tooling only | Upstream release / `minimatch` override |

**Remediation trial (documented, reverted):** overrides `postcss@^8.5.32`, `decode-uri-component@^0.5.1`, `esbuild@^0.28.2` plus `glob`/`minimatch` reduced the report to 12 affected packages with **0 high** and 2 critical (Vitest only) — but under this npm 11.20 workspace layout the combined override set produced an incomplete install (`styled-jsx`/`@swc/helpers` listed in the lock but never materialised, and a peer-resolution conflict), so all overrides were reverted rather than shipping a fragile tree. Recorded here for a separate decision; nothing was suppressed and no audit was bypassed.

Final audit after all work: **21 affected packages / 7 families, `npm audit` exit 1.** No production web runtime path is affected (Next/React/Zod/Drizzle/pg/Supabase are clear); the critical and high findings sit in test tooling, build tooling, and the Android bundling path.

## 9. Quality-gate results (final working tree)

All commands were run from the repository root on this branch. Exit codes are as observed.

| Gate | Command | Exit | Result |
| --- | --- | --- | --- |
| Install + lockfile | `rm -rf node_modules package-lock.json && npm install` | 0 | Lock regenerated; one `ERESOLVE` warning about the optional `react-native-worklets` peer (Expo-side, non-fatal) |
| Lockfile consistency after build | `npm install` | 0 | Next's SWC lock patch applied, install re-synced |
| Formatting | `npm run format:check` | 0 | All matched files clean (owner docs and planning records excluded by `.prettierignore`) |
| Lint | `npm run lint` | 0 | ESLint 9 flat config, `next/core-web-vitals` + `next/typescript`: 0 errors, 0 warnings |
| Typecheck | `npm run typecheck` (all workspaces) | 0 | web, android, domain, design-tokens |
| Unit tests | `npm test` (Vitest 3.2.7) | 0 | **6 files, 40 tests passed** |
| Web production build | `npm run build` | 0 | Next 15.5.29; 7 routes; First Load JS 102 kB |
| Android typecheck | `npm run android:typecheck` | 0 | `tsc --noEmit` in the Expo workspace |
| Android Metro export | `npx expo export --platform android` | 0 | Hermes bundle `entry-87eeae6a…hbc`, 2.7 MB |
| Database generate | `npm run db:generate` | **1** | `No schema files found for path config []` — **expected**: no tables exist yet; the identity slice owns the first migration. Not claimed as a pass. |
| Dependency audit | `npm audit` | **1** | 21 affected packages / 7 families, all documented in §8 |
| Import boundaries | `npm run check:boundaries` | 0 | 22 files checked, no violations |
| Secret scan | `npm run secret-scan` | 0 | 57 tracked files scanned, clean |
| Diff review | `git status`, `git diff` | — | Reviewed: no secrets, no `.env` files, no generated artifacts, owner-authored documents untouched (reverted after a formatter pass) |

**No CI exists** (G-5 unapproved); every gate above runs locally.

## 10. Native Android build limitation

No Java runtime and no Android SDK were available in this environment, so **no native Android build was run and none is claimed**. What *is* verified: Expo configuration, SDK 57 compatibility (`npx expo install --check`), monorepo Metro resolution, TypeScript typecheck and a successful release-mode Metro/Hermes export.

Exact native build requirements and commands (also in `android/README.md`):

- JDK 17+, Android SDK platform + build-tools, `ANDROID_HOME` exported, `JAVA_HOME` exported.
- `cd android && npx expo prebuild --platform android --clean`
- `cd android/android && ./gradlew assembleDebug` (debug APK) or `./gradlew bundleRelease` (AAB, signing required).
- Then install with `adb install app/build/outputs/apk/debug/app-debug.apk`.

## 11. Known defects and unfinished work

1. `SupabaseSessionSource.verify()` returns `null` by design until G-2 credentials and TASK-006A — identity flows are **not** functional yet, and nothing pretends they are.
2. `db:generate` exits 1 until the identity slice introduces schema files (`db/migrations` is intentionally empty).
3. Seven dependency advisory families remain (§8); two require breaking upgrades (Vitest 5, Expo SDK 58) and one needs an override strategy decision.
4. Two React versions coexist: web resolves React `19.3.1` at the root, the Android workspace pins Expo SDK 57's `19.2.3`. Shared packages contain no React, so this is isolated; it is documented rather than silently unified.
5. The web app has no real Supabase client wired (provider path is a guarded stub), no service worker/offline support, and placeholder surfaces only.
6. No CI, no deployment, no published Android artifact.

## 12. Local development commands

```bash
npm install                 # install all workspaces
npm run dev                 # web dev server (Next.js)
npm test                    # Vitest suite
npm run lint                # ESLint (web workspace)
npm run typecheck           # all workspaces
npm run build               # production web build
npm run format:check        # Prettier check
npm run secret-scan         # tracked-file credential scan
npm run check:boundaries    # client/server import boundary check
npm run audit               # npm audit (exit 1 until advisories are triaged)
npm run android:start       # Expo dev server (needs a device/emulator or Expo Go)
npm run android:typecheck   # Android TypeScript check
npx expo export --platform android --output-dir .expo-export-check   # bundle check
```

## 13. Next READY task and dependencies

**Recommended next: TASK-004 — design tokens and responsive application shell** (web-first), now unblocked by this scaffold. It should bind `packages/design-tokens` into real surfaces, implement loading/empty/error/disabled states per `DESIGN_SYSTEM.md`, and stay within the confirmed MVP scope. Android remains foundation-only; no feature parity work until web establishes the patterns.

Owner decisions still outstanding: triage of the audit items (§8), and whether to proceed to TASK-004.

## 14. Rollback / recovery

Foundation commits are additive (`6933820`, `388d3fe`, `3657c60`). Reverting the documentation commit alone loses no code. To drop the whole foundation, revert those three commits in reverse order (C, B, A); nothing was merged into `main`, so `main` is untouched.
