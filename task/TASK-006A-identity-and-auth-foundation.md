# TASK-006A — Identity and auth foundation

Status: READY (in form) — start only after G-1 approval and after TASK-003 scaffold + TASK-005 quality gates exist.

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
