# TASK-006A — Identity and auth foundation

Status: **PARTIAL** (2026-11-07) — server-side Supabase token verification implemented and tested; live provider binding blocked on B-7 (`SUPABASE_AUTH_URL` / `SUPABASE_AUTH_ANON_KEY` not present in the environment). See `handoff/TASK-006.md`. Started after G-1 approval and the TASK-003 scaffold + TASK-005 gates existed.

Goal
Add email-based sign-up/sign-in/recovery via Supabase Auth and server-side session verification, so the app has an identity foundation without building a second password system.

Non-goals
- Real payments, payouts, subscriptions.
- Full creator/provider economics.
- Profile UI polish beyond what verifies the identity/ownership model.

Acceptance criteria
- Supabase Auth handles email sign-up/sign-in/recovery; the server verifies the session server-side before any protected work.
- The app stores the identity key as `supabase_user_id` (UUID) in Neon; no password column in the app database.
- Environment variables for Supabase Auth and Neon are present, validated at boot, and server-side only (`ADR-0007`).
- The server can look up or create the profile row keyed by `supabase_user_id`.

Affected areas
- identity, auth session, db schema/migrations, env/secrets, server-only layout (`ADR-0006`).

Risks
- Leaking Supabase Auth credentials into the client bundle or repo.
- Treating client-supplied identity/roles as truth.
- Weak session lifecycle handling.

Test plan
- Valid/invalid credentials and recovery flow tests where Supabase Auth supports them.
- Session verification tests before protected work.
- Session lifecycle tests where supported.
- Secret scan and env validation must pass before any real credentials are used.
- Use test doubles until the owner provisions free-tier Supabase Auth + Neon dev projects (G-2).

Dependencies
- G-1 approval of the architecture plan.
- TASK-003 scaffold and TASK-005 quality gates.
- `ADR-0001`, `ADR-0003`, `ADR-0006`, `ADR-0007`.
- Owner provisioning of free-tier Supabase Auth + Neon development projects (G-2), or clearly labelled test doubles until then.

Security / privacy impact
- Identity is the highest-value surface. Server-side session verification, deny-by-default, and parameterised queries are mandatory. Logs must redact tokens/secrets.

Cost impact
- None incurred. Supabase Auth + Neon provisioning is an owner gate; free-tier/dev usage only after owner action.

## Implementation record (2026-11-07)

Branch `chore/autonomous-foundation-v1`; full detail and evidence in `handoff/TASK-006.md`.

- **Done:** `SupabaseSessionSource` verifies tokens through Supabase Auth's `/auth/v1/user`
  using the already-installed `@supabase/supabase-js` (no dependency added), with
  signature/issuer/audience/expiry/revocation judged by the provider. Config-gated; fails
  closed to `null`; verified id must be a UUID; roles stay the fixed `member` default.
- **Not done, blocked:** live sign-in/sign-out and cookie sessions. The environment holds a
  Supabase **Postgres connection string**, not Auth API credentials, so no Auth endpoint can
  be called and no live verification is claimed.
- **B-7a resolved (2026-11-07):** `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` now point
  at the real SYNERGY project (`gqvtpvnipfrcqfkdevsx`). Live: `/auth/v1/settings` 200, forged
  token rejected 403 by the provider, and our protected route returns a uniform 401 both with
  no token and with the rejected one (fail closed). The running app confirms it, too: a
  temporary probe reported `{"configured":true}` (deleted before commit). Next loads env from
  its project directory, so the file the app reads is `web/.env.local`. The anon key only; no
  `service_role` key.
- **B-7b open:** a successful session is not yet verified — the project has no confirmed test
  user and email confirmation is required. Needs an owner-confirmed user or approval to create
  one.
- TASK-006B remains blocked and was not started.
