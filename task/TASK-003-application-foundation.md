# TASK-003 — Application foundation

Status: IN_PROGRESS (owner-authorised via MISSION 02; supersedes the ROADMAP "BLOCKED on TASK-002 approval" status because the owner approved G-1 for the application-foundation phase).
Branch: `chore/autonomous-foundation-v1`
Base: `3ce42e6897072c916e86e2bbeb333856c2813410`

## Objective
Establish a real, testable application foundation for SYNERGY: a web foundation (Next.js App Router, mobile-first, design tokens), a separate Android application foundation (documented path; no Play Store or release claims), a minimal shared domain-contract boundary, a server-side enforcement boundary (env validation, auth verification, deny-by-default authorisation, validation, safe errors, redacted logging, parameterised DB access, rate-limit boundary), and repository hygiene (gitignore, `.env.example`, docs, quality gates).

## Non-goals
- No payments, wallet, escrow, payouts, commissions, subscriptions (D-015..D-019 remain UNRESOLVED).
- No live marketplace bookings, production messaging, full SOAP governance product.
- No provisioning of Neon/Supabase/Cloudinary; no real credentials; no deployment; no merge into main; no CI (G-5).
- No full identity/profile feature implementation (TASK-006A/006B remain the owners of that).
- No invented business rules; no promotion of RECOMMENDED defaults to CONFIRMED.

## Backend/client rules carried into this task
- Supabase Auth is the only identity authority; no second password system; browser-supplied user IDs are never proof of identity.
- Neon via a parameterised, ORM-mediated data boundary; no Supabase `auth.uid()`/`auth.jwt()` assumptions on Neon.
- Media stays behind a provider boundary (no Cloudinary integration in this task).

## Acceptance criteria
1. Web foundation exists, typechecks, lints, passes unit tests, and builds for production.
2. Android foundation exists with entry point, navigation foundation, shared visual direction, env-without-secrets configuration, dev/build documentation; build verification blocked by missing Android SDK and documented with exact reproducible commands.
3. Shared domain contracts and design tokens exist once, used by both clients; no duplicated business rules.
4. Server boundaries exist: env validation, session verification (interface + Supabase path + labelled test double), ownership/role authorisation deny-by-default, structured validation, safe errors, redacted logs, parameterised DB factory, rate-limit boundary.
5. Tests demonstrate cross-user access denial for a protected-resource boundary using test doubles; remaining verification gaps are explicitly labelled (not claimed as production security).
6. `.gitignore`, `.env.example` (names/descriptions only), dev docs, formatting/lint/typecheck/test/build commands, secret scan, and dependency audit wired locally; no credentials committed.

## Dependencies
- TASK-002 outputs reviewed; owner authorisation (G-1) granted via MISSION 02.

## Test plan
- `npm ci` install; lockfile verification; format check; lint; typecheck (web + android + packages); vitest unit suites; `next build`; Expo typecheck + `expo export -p android` bundle check attempt; secret scan script; `npm audit`; git diff review; remote HEAD verification after push.

## Risks
- Metro/workspace symlink behaviour inside the Expo app is not runnable without the Android toolchain — documented as unverified.
- Env validation and auth boundary are honest foundations, not production security until real provider integration (G-2).
