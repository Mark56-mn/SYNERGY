# TASK-006 — Identity and profile persistence planning handoff

- **Task ID / title:** TASK-006 — Identity and profile persistence
- **Status:** BLOCKED — planning document prepared; implementation has not started.
- **TASK-006A status (2026-11-07):** **PARTIAL** — server-side Supabase verification implemented and tested; live provider binding blocked on B-7 (`SUPABASE_AUTH_URL` / `SUPABASE_AUTH_ANON_KEY` absent). See the implementation record at the end of this file.
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

No application code, dependencies, schema, migrations, provider configuration or credentials were changed. The current `SupabaseSessionSource.verify()` remains a non-live boundary that returns null until the identity slice is implemented. Demo profile content remains fictional and labelled.

> Superseded for TASK-006A only by the implementation record below (2026-11-07). TASK-006B remains exactly as described here: nothing started.

## Blocking conditions

1. G-2 owner provisioning is not evidenced as complete.
2. The owner must explicitly release TASK-006A for implementation after provisioning.
3. TASK-006B depends on TASK-006A being implemented and reviewed.
4. B-5 dependency-major decisions and G-5 CI selection remain separate unresolved items.

No accounts were created, no paid services used, no secrets requested or exposed, no deployment performed, and no merge to `main`.

## Security and privacy

The plan preserves Supabase Auth as the sole identity authority and Neon as the application database. It explicitly forbids trusting browser-supplied IDs/roles, assumes no Supabase auth helpers on Neon, requires server-side token verification, owner-only mutations, negative cross-user tests, safe errors, rate limits and redacted logs. Profile visibility/field policy must come from normative sources; missing rules require owner review.

## UI and design

Preserve the existing navy + mint token system, mobile-first layout, accessible components and responsive checks. Demo fixtures must remain visibly demo-only until persisted routes are ready. No invented avatar, verification or public/private profile defaults.

## Commands and evidence

No build/test command was run because this was a planning-only GitHub documentation operation, not a checked-out workspace execution. No test result is claimed.

## Next action

Owner completes G-2 using free-tier development services and environment secret storage, then explicitly authorises TASK-006A. Only after TASK-006A review may TASK-006B begin.

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

**Not live-verified.** The environment contains a Supabase **Postgres connection string**,
not Auth API configuration. `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` are absent, so
sign-in, sign-out, cookie sessions and any end-to-end flow against the real project were not
built: that would have been unverifiable code claiming an integration it never exercised.

## Environment verification (names only)

| Variable | Required | Found |
| --- | --- | --- |
| `SUPABASE_AUTH_URL` | yes | **MISSING** |
| `SUPABASE_AUTH_ANON_KEY` | yes | **MISSING** |
| `DATABASE_URL` | not for 006A | absent |
| `SUPABASE_CONNECTION_STRING` | no — a Postgres DSN, not Auth config | present |
| `NEON_CONNECTION_STRING` | no — 006B owns it | present |
| `CLAUDENARY_CREDENTIALS` | no — Cloudinary, out of scope | present |

The three provider values exist under **arbitrary secret names**; the app reads fixed names
(`.env.example`, ADR-0007), so `SUPABASE_CONNECTION_STRING` is never read as
`SUPABASE_AUTH_URL`.

### Blocker B-7 (owner action)

Add to Settings → Secrets: `SUPABASE_AUTH_URL` (`https://<project-ref>.supabase.co`) and
`SUPABASE_AUTH_ANON_KEY` (anon/public key). Do **not** add a `service_role` key. Supply the
Neon DSN as `DATABASE_URL` when TASK-006B starts.

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

**NOT RUN (not claimed as passing):** `npm run check:responsive` (no UI source change; dev
server not started this turn) and `npx expo export --platform android` (no Android change).

## Known limitations

1. No live verification — B-7.
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

TASK-006B stays blocked: it needs this task live-verified plus `DATABASE_URL`. Its first
migration keys profiles by the `supabase_user_id` this verification now produces.
