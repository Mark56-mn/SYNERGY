# TASK-006B — Authentication UI and session lifecycle

Status: **PARTIAL (2026-11-08)** — complete implementation of all screens,
session lifecycle, logout and server authorization shipped and tested;
positive real-user verification **BLOCKED on B-7b** (no test account,
`SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` absent). Implementation
record: `handoff/TASK-006B.md`.
Branch: `chore/autonomous-foundation-v1`
Implementation commit: `1758353` (plus follow-up docs commit)
Handoff: `handoff/TASK-006B.md`

> **Label note:** this mission reuses the `TASK-006B` label for the
> authentication-UI slice. The pre-existing profile-persistence task keeps
> its separate file (`task/TASK-006B-profile-ownership-and-visibility.md`)
> and remains gated on B-7b + `DATABASE_URL`. No Neon schema or migration
> was created by this mission (§8 of the mission brief). The owner may wish
> to rename one of the two for clarity.

## Objective

Make SYNERGY usable end-to-end (modulo the blocked positive path): real
users can register, confirm their email, sign in, keep a session across
navigation and refresh, reach an account page, and sign out — reusing the
TASK-006A Supabase Auth server verifier as the only identity authority.

## Scope completed

- Server-only Supabase Auth gateway (sign-in, sign-up, sign-out, password
  recovery, password update, refresh) with injectable transport.
- HttpOnly session cookies (`synergy_access_token`,
  `synergy_refresh_token`) + edge middleware that refreshes expired access
  tokens and clears dead sessions.
- Cookie fallback in session resolution (Bearer header still wins for API
  clients; existing tests unchanged).
- Screens: `/login`, `/register`, `/forgot-password`, `/reset-password`,
  `/auth/callback`, `/account` (server-gated).
- Authenticated navigation in `AppShell`, `Sidebar`, `BottomNav`, mobile
  header — server-rendered from the verified session, correct on first
  paint.
- Logout: provider revoke (best effort) + unconditional local cookie
  clearing, duplicate-request prevention.
- Same-origin CSRF checks on cookie-backed mutations; open-redirect guard
  on post-login destinations.
- Rate limiting (20/min/peer, in-memory) on credential endpoints.
- 72 new tests (156 total), every provider interaction stubbed and
  labelled; live negative-path checks against the real provider recorded
  in the handoff.

## Non-goals (explicitly not done)

- No database schema/migrations/profile persistence (separate 006B).
- No social login, MFA UI, admin roles, account deletion.
- No account creation by an agent, no autoconfirm, no service-role key.
- No major dependency changes (zero new packages).
- No deployment, no merge to `main`.

## Acceptance criteria and state

1. Login / register / recovery / reset / callback / logout flows exist
   with loading, validation and honest error states — **done**.
2. Sessions survive navigation + refresh; expired tokens refresh;
   refresh failure clears safely — **done (mocked); live refresh with a
   real token not yet exercised (B-7b)**.
3. Protected pages never flash private data; public pages stay public —
   **done** (server-side gate + redirect; verified live for `/account`).
4. No token/password in localStorage, bundles or logs; browser-supplied
   identity never authorizes — **done** (bundle grep + tests).
5. Automated tests cover login/register/recovery/session/logout/authz —
   **done (72 new tests)**.
6. Real-user positive path end-to-end — **BLOCKED (B-7b)**: needs an
   owner-confirmed test account + `SUPABASE_TEST_EMAIL` /
   `SUPABASE_TEST_PASSWORD` in the secret store (see handoff runbook).
7. Design system preserved; responsive checked in jsdom + build —
   **done**; Playwright responsive gate **NOT RUN** (browser unavailable
   in this environment, recorded honestly).

## Dependencies and blockers

- TASK-006A verifier: done, reused unchanged in behaviour.
- B-7b positive path: needs owner test account + secrets (owner actions
  listed in `handoff/TASK-006B.md` §11).
- Profile persistence (other 006B): needs B-7b + `DATABASE_URL` +
  separate release.
- B-5 dependency majors: unchanged, separate.
