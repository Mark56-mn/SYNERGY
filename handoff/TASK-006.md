# TASK-006 — Identity and profile persistence planning handoff

- **Task ID / title:** TASK-006 — Identity and profile persistence
- **Status:** TASK-006A **PARTIAL**; TASK-006B **BLOCKED / not started**.
- **TASK-006A status (updated 2026-11-08):** server-side Supabase bearer-token verification is implemented and covered by 12 transport-stubbed tests. The implementation agent reports Auth URL/anon-key configuration and provider reachability/forged-token rejection as live-checked. A successful real-user token/session round trip remains unverified (B-7b). Sign-in/sign-up, cookie sessions, CSRF and logout are not implemented. See the implementation record below.
- **Branch:** `chore/autonomous-foundation-v1`
- **Planning base:** `f58fdfbc4acb8321a0c6b503eacbb15de2ac4823`
- **Commit:** pending this planning-only record.
- **Objective:** prepare a gated, testable plan for server-verified Supabase Auth sessions and Neon-backed user profiles.

## Scope prepared

The implementation is split into:
- TASK-006A: provider-backed identity/session integration.
- TASK-006B: minimal profile schema, migrations and owner-authorised profile read/update flows.

The complete scope, non-goals, security rules, acceptance criteria, test plan, risks and recovery requirements are in `task/TASK-006-identity-and-profile-persistence.md`.

## Current implementation state

TASK-006A changed application code in three files (a new verifier, composition-root update and new tests); it added no dependency, schema or migration. The bearer-token path calls Supabase Auth server-side and fails closed. The implementation agent reports the Auth variable names are present in approved environment secrets and provider reachability/forged-token rejection were live-checked. This review has not independently repeated those network checks. A positive real-user token has not been verified. Demo profile content remains fictional and labelled.

TASK-006B remains not started and blocked. The earlier planning-only statements below are historical planning context, not the current implementation state.

## Blocking conditions

1. **B-7b positive-path verification remains open:** no successful real-user token/session round trip has been evidenced. Obtain an owner-confirmed test user's short-lived token through an approved out-of-band secret channel, or request separate explicit approval for a test-account creation procedure.
2. **TASK-006B remains blocked:** requires successful positive-path verification and review of TASK-006A, plus `DATABASE_URL` in approved secret storage.
3. Do not create users, change Auth settings, enable email auto-confirm, use `service_role`/`sb_secret`, or implement cookie/sign-in/logout flows without explicit scope approval.
4. B-5 dependency-major decisions and G-5 CI selection remain separate unresolved items.

No accounts were created, no paid services used, no secret values recorded in GitHub/chat, no deployment performed, and no merge to `main`. Auth variable names are reported present in approved environment secrets.

## Security and privacy

The plan preserves Supabase Auth as the sole identity authority and Neon as the application database. It explicitly forbids trusting browser-supplied IDs/roles, assumes no Supabase auth helpers on Neon, requires server-side token verification, owner-only mutations, negative cross-user tests, safe errors, rate limits and redacted logs. Profile visibility/field policy must come from normative sources; missing rules require owner review.

## UI and design

Preserve the existing navy + mint token system, mobile-first layout, accessible components and responsive checks. Demo fixtures must remain visibly demo-only until persisted routes are ready. No invented avatar, verification or public/private profile defaults.

## Commands and evidence

No build/test command was run because this was a planning-only GitHub documentation operation, not a checked-out workspace execution. No test result is claimed.

## Next action

TASK-006A has already been explicitly authorised and partially implemented. The next gate is B-7b: verify a real user's short-lived token through the existing protected route, without creating accounts or changing Auth settings unless separately approved. Independently review the verifier and rerun the documented local gates. Only after positive-path verification and code review pass, and `DATABASE_URL` is available in approved secret storage, may TASK-006B be proposed for release.

---

# TASK-006A implementation record — 2026-11-07 (agent)

Status: **PARTIAL**. Authorised by the owner's TASK-006A release (MISSION 02, 2026-11-07).
Branch `chore/autonomous-foundation-v1`, rebased onto the owner's planning tip
`d7c3f04`. TASK-006B: **not started**.

## Outcome

The session boundary no longer returns `null` unconditionally. `SupabaseSessionSource` now
verifies the caller's token through Supabase Auth's own `/auth/v1/user` endpoint via
`@supabase/supabase-js` — already a dependency, so **no package was added** — with signature,
issuer, audience, expiry and revocation judged by the provider. No hand-rolled cryptography,
no second password store, no service-role key.

**Positive path not verified.** At implementation time the Auth API variables were initially absent, so sign-in/sign-out/cookie-session flows were not built. The owner subsequently added `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` to approved environment secrets and refreshed the ignored app environment file. The implementation agent reports live provider reachability and forged-token rejection, but a successful real-user session has not been tested. This review has not independently reproduced the provider network calls.

## Environment verification (names only)

| Variable | Required | Found |
| --- | --- | --- |
| `SUPABASE_AUTH_URL` | yes | present since 2026-11-07 (local `.env.local`, gitignored) |
| `SUPABASE_AUTH_ANON_KEY` | yes | present since 2026-11-07 (local `.env.local`, gitignored) |
| `DATABASE_URL` | not for 006A | absent |
| `SUPABASE_CONNECTION_STRING` | no — a Postgres DSN, not Auth config | present |
| `NEON_CONNECTION_STRING` | no — 006B owns it | present |
| `CLAUDENARY_CREDENTIALS` | no — Cloudinary, out of scope | present |

The application reads the fixed names `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` (see `.env.example` and ADR-0007). Postgres DSN variables are distinct and are not substitutes for the Auth API URL/key. Do not print or copy secret values into this handoff.

### Blocker B-7 — **URL and key resolved; positive-path session still pending**

**Resolved 2026-11-07** via the owner's Freebuff Supabase integration: project **SYNERGY**,
ref `gqvtpvnipfrcqfkdevsx`, `ACTIVE_HEALTHY`, `eu-central-1`, Auth config
`external_email_enabled: true`, `disable_signup: false`, `site_url: http://localhost:3000`.
`SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` (the legacy **anon** key — never the
`service_role`/`sb_secret` key) are now in the gitignored `.env.local`.

Live checks actually run (status codes only, no values recorded):

| Check | Result |
| --- | --- |
| `GET /auth/v1/settings` with the anon key | **200** — URL and key are valid and reachable |
| `GET /auth/v1/user` with a forged bearer token | **403** from Supabase |
| `GET /api/v1/owned-items`, no token | **401** `unauthorized` |
| `GET /api/v1/owned-items`, forged token (our code calls the provider) | **401** `unauthorized`, failing closed |

The last row is the important one: the request left our process, was rejected by the real
provider, and the boundary converted that rejection into the uniform unauthenticated result.

App-side confirmation: a temporary `/api/v1/probe` route (deleted before committing; the tree
was clean afterwards) reported `{"configured":true}` from `isSupabaseAuthConfigured()` at
runtime, so the running app — not just `curl` — sees the Auth configuration.

**Where the file must live:** Next loads env from its own project directory, so the copy at
`web/.env.local` is the one the app reads. Both `web/.env.local` and the repository-root
`.env.local` are gitignored. A clean "root file only" control was attempted and **invalidated
by a shell `cwd` mistake**, so it is not claimed; treat `web/.env.local` as required.

**Still outstanding (B-7b):** a *successful* session has not been verified, because the
project has no confirmed test user and `mailer_autoconfirm` is `false`, so sign-up cannot
complete without mailbox access. That needs either an owner-confirmed test user whose access
token can be supplied out-of-band, or explicit approval to create a test user (which changes
project auth state and is therefore not done unilaterally). Do **not** work around this with a
`service_role` key.

Owner follow-up **reported complete 2026-11-07**: both Auth variable names are exported by the environment (Settings → Secrets) and were confirmed present by name only. The implementation agent reports `.env.local` and `web/.env.local` were refreshed from the environment. Supply the Neon DSN as `DATABASE_URL` only after TASK-006B is separately released.

### Incident disclosure

On an earlier turn this agent overwrote `.env.local` with local placeholders while inspecting
the environment. That file is generated from project secrets, so the values themselves remain
in the project's secret store; the file's prior contents were replaced. Regenerate it from
Settings → Secrets. It is gitignored and was never committed. Agent error, not the owner's.

## Files changed

| File | Change |
| --- | --- |
| `web/src/server/auth/supabase-session.ts` | **New.** `createSupabaseTokenVerifier()` — the real verification path. |
| `web/src/server/provider-access.ts` | Real verifier replaces the always-`null` stub; still configuration-gated. |
| `tests/supabase-identity.test.ts` | **New.** 12 tests. |

No UI, tokens, schema, migration, route, demo-data, Android or dependency change.

## Verification flow

1. `bearerTokenOf()` reads only `Authorization: Bearer <token>`.
2. Absent/malformed/empty token → `null` → protected routes deny.
3. Otherwise `auth.getUser(token)` → the provider validates signature, issuer, audience,
   expiry and revocation.
4. Provider error, non-2xx, network failure or malformed body → `null` (fail closed).
5. Returned id must be a UUID; otherwise `null`.
6. `SupabaseSessionSource` yields `{ userId, roles: ["member"] }`; no claim, header or body
   field can add a role.

## Security review

| Risk | Finding |
| --- | --- |
| IDOR/BOLA | Identity still comes only from the verified session; a test posts `userId`/`ownerId`/`role` and `?user_id=` for another user and the session stays the verified user with `["member"]`. |
| Mass assignment | No route or service reads identity/role fields from input (re-covered). |
| Forged/expired/revoked token | Delegated to the provider; non-UUID ids rejected; all outcomes collapse to `null`. |
| Token leakage | Provider error text is discarded (it can quote token fragments); nothing logs or echoes the token. |
| Enumeration | One uniform failure shape and the existing uniform `401 unauthorized`. |
| Privilege escalation | No service-role key; roles never derived from tokens. |
| CSRF | Not applicable to the bearer path (no ambient cookie authority). Cookie/SSR sessions unimplemented. |
| Secret exposure | Only variable names appear in code, tests and docs. Secret scan clean over the tracked tree. |

## Live configuration verification (2026-11-07)

Recorded above under B-7. Summary: real project reachable (200), anon key valid, forged token
rejected by the provider (403) and denied by our route (401), no token denied, and the running
app reports itself configured (`{"configured":true}` via a temporary probe). A valid-session
round trip remains outstanding (B-7b: no confirmed test user).

## Evidence

| Gate | Exit | Result |
| --- | --- | --- |
| `npm run format:check` | 0 | Clean |
| `npm run lint` | 0 | 0 errors, 0 warnings |
| `npm run typecheck` | 0 | All workspaces |
| `npm test` | 0 | **14 files / 84 tests** (was 13 / 72; +12) |
| `npx vitest run tests/supabase-identity.test.ts` | 0 | 12 passed |
| `npm run build` | 0 | Compiled successfully |
| `npm run secret-scan` | 0 | Clean |
| `npm run check:boundaries` | 0 | Clean, 46 files |
| `npm run android:typecheck` | 0 | Unchanged |
| `npm audit` | 1 | Unchanged: 19 advisories (B-5) |

Covered: provider-accepted token → provider id; provider 401/500 → `null`; transport failure →
`null`; empty token → `null` **with no provider call**; non-UUID id → `null`; missing header;
non-Bearer scheme; empty Bearer; rejected token; verified token → `["member"]`; distinct
tokens → distinct users; crafted body/query identity ignored.

**NOT RUN (not claimed as passing for TASK-006A):** `npm run check:responsive` (no UI source change; dev server not started) and `npx expo export --platform android` (no Android change). Earlier TASK-005 responsive and TASK-003/TASK-005 Android export evidence is historical, not a fresh TASK-006A run.

## Known limitations

1. Configuration is live-verified (provider reachable, forged token denied end-to-end); a
   **successful** session is not yet verified — B-7b needs a confirmed test user.
2. No sign-in UI, login route, cookie session, CSRF token or logout endpoint. Supabase email
   flows need the anon key; building them blind was rejected rather than faked.
3. Per-request provider round-trip; a verified-session cache is a TASK-006B decision.
4. Revocation relies on the provider's own behaviour; not separately tested.
5. Auth-specific rate limits land with the auth endpoints; the existing wrapper limiter is
   untouched.

## How to verify after B-7

```bash
npm ci
npx vitest run tests/supabase-identity.test.ts   # boundary, transport stubbed
for n in SUPABASE_AUTH_URL SUPABASE_AUTH_ANON_KEY; do [ -n "${!n}" ] && echo "$n present"; done
# Then call a protected route with a real token from the Supabase dashboard test user:
#   no token → 401, valid token → 200, forged/expired → 401.
```

That dashboard-token check is the step that converts "implemented" into "live-verified".

## Next

TASK-006B stays blocked: it needs successful positive-path real-user token verification and independent code review, plus `DATABASE_URL` in approved secret storage and a separate task release. Its first migration should key profiles by the verified `supabase_user_id` produced by this boundary. No schema work is authorised by this handoff update.

## Positive-path verification mission — 2026-11-08 (agent)

Outcome: **BLOCKED.** The mission asked for a genuine-user positive-path check (D) on the
protected route. Both of its prerequisites fail, so it did not run. TASK-006A remains
**PARTIAL**; nothing about the app was changed this mission.

### A–E status

| Item | State | Evidence |
| --- | --- | --- |
| A. Supabase credentials configured | reported | `SUPABASE_AUTH_URL` + `SUPABASE_AUTH_ANON_KEY` present (names only, anon key only) and refreshed into the gitignored env files — reported by the implementation agent (see the record above) |
| B. Provider connectivity | reported | `/auth/v1/settings` 200; `GET /api/v1/owned-items` 401 with no token — reported by the implementation agent (see the record above) |
| C. Forged-token rejection | reported | provider 403 for forged token; route 401 for forged token; 12 boundary tests present — reported by the implementation agent (see the record above) |
| D. Genuine-user positive path | **BLOCKED** | `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` absent (names-only env check, this mission); the SYNERGY project holds **zero** Auth users (mission-run read-only aggregate: 0 total, 0 confirmed) |
| E. Sign-in/session lifecycle | not implemented | no login UI or route, no cookie session, no CSRF token, no logout — out of scope and still so |

A–C do not imply D, and none of them imply E.

### Why it stops here

This mission forbids creating a Supabase user, modifying an existing user's account,
enabling email autoconfirm, and using a service-role key to mint a session. With zero users
in the project, a positive run would require breaking one of those rules — so it was not
attempted. The exact missing prerequisites (owner actions):

1. Create + email-confirm a test account in the SYNERGY project's Auth dashboard
   (`mailer_autoconfirm` is `false`, so sign-up cannot proceed without mailbox access).
2. Add `SUPABASE_TEST_EMAIL` and `SUPABASE_TEST_PASSWORD` to Settings and Secrets — an
   approved-channel form of B-7b's out-of-band requirement, read from the process
   environment by the (out-of-tree) verification harness, never from source.

`.env.example` documents only the app's four variables and deliberately supports no
test-account names; the `env.ts` zod schema tolerates extra environment variables (it is
not `.strict()`), and the app never reads the test names.

(The B-7b row also names a short-lived access token supplied through an approved
out-of-band channel as an alternative to account-channel credentials; the runbook below
uses the email/password channel. Either form requires the step-1 account to exist and be
email-confirmed.)

### Inspection notes (no code changes made; tree-checkable)

- `web/src/app/api/v1/owned-items/route.ts`: GET `200 {items}` scoped by the verified
  `session.userId`; POST `{title}` yields `201 {item}` whose `ownerId` is the verified
  `userId` (the schema accepts `title` only). There is no middleware file — protection is
  per-route via `createApiRoute`.
- `web/src/server/http/handler.ts` (line 80): the session is resolved **before** body
  parsing and before the data handler runs; an `AppError` thrown by
  `requireAuthenticatedUser` aborts the pipeline, so a failed auth check cannot create or
  modify user data (`insert` is only reachable after `requireAuthenticatedUser` passes).
- `web/src/server/auth/supabase-session.ts`: provider-side `auth.getUser` verdict; provider
  error text is deliberately discarded (it can quote token fragments); non-UUID ids rejected;
  the provider-returned id is the only identity source.
- `createOwnedResourceService` reads nothing from query/body for identity; `deleteItem`
  verifies ownership before mutation; another user's item answers `not_found`.
- File-level checks this mission: no `console.*` statement in `web/src/server/` logs an
  `Authorization` header or token (grep clean), and the two protected routes' response bodies
  contain no credential or token (the only identity value is the verified `ownerId` on the
  created item). Per the narrowed test scope (5d5cea6), these are tree greps, not an
  instrumented full-pipeline proof of system-wide non-disclosure.
- The rate-limit peer key derives from `x-forwarded-for` — coarse, for abuse-limiting only,
  never identity. No finding.

**No genuine defect found.** The one open limitation is D/E above, a prerequisite problem,
not a code problem.

### Gates (this mission, after a clean `npm ci` — lockfile untouched, no upgrades)

| Gate | Exit | Result |
| --- | --- | --- |
| `npm run format:check` | 0 | Clean |
| `npm run lint` | 0 | 0 errors, 0 warnings |
| `npm run typecheck` | 0 | All workspaces |
| `npm test` | 0 | **14 files / 84 tests** |
| `npm run secret-scan` | 0 | Clean |
| `npm run check:boundaries` | 0 | Clean |
| `npm run android:typecheck` | 0 | Unchanged |
| `npm run build` (web production) | 0 | Compiled successfully |
| `npm audit --audit-level=high` | 1 | B-5 advisories unchanged (not a gate; not addressed here) |
| `npm run check:responsive` | NOT RUN | No UI source changed; browser install assumed unavailable |
| `npx expo export --platform android` | NOT RUN | No Android source changed |

History check: no JWT-like strings and no `sb_publishable_`/`sb_secret_` values appear in
`git log --all -p` output (count-only grep).

### Positive-path runbook for the next agent (after the owner unblocks)

1. Verify `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` are present (names only).
2. Sign in: `POST /auth/v1/token?grant_type=password` with the anon `apikey` header and
   `{email, password}` in the body. Keep `access_token` and `user.id` in process memory
   only; never print, log, write, commit, or screenshot them.
3. `GET /api/v1/owned-items` with `Authorization: Bearer <token>` — expect 200 (a new
   caller has no items yet, so an empty list is the expected shape).
4. `POST /api/v1/owned-items` `{title: "..."}` with the bearer token — expect 201, and the
   response `item.ownerId` must equal the sign-in `user.id`. Compare in memory; record only
   pass/fail. (This is the route's only place that echoes the derived identity.)
5. Same token with `?user_id=<other UUID>` and `?isAdmin=true&role=admin` — identity and
   role must not change (only the verified user's items appear).
6. No token → 401. One-character-flipped token → 401. Forged or malformed token → 401.
7. Expired/revoked token live checks are **not runnable** without a service key or waiting
   out the 3600 s expiry: provider-side `getUser` expiry semantics plus the stubbed unit
   tests cover them. Do not mint one with the service key.
8. After the run, the token and sign-in result must be gone with the process; confirm the
   dev-server log contains no `Bearer` string before shutting down.

Then record the D result to close B-7b, re-run the §8 gates, and only then reconsider
TASK-006B (which additionally needs `DATABASE_URL`).
