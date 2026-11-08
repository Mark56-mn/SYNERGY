# TASK-006B — Authentication UI and session lifecycle handoff

- **Task ID / title:** TASK-006B — Authentication UI and session lifecycle
  (mission's 006B; see the label note in the task file — the profile-
  persistence 006B file is separate and untouched by this mission).
- **Status:** **PARTIAL (2026-11-08).** Implementation complete; positive
  real-user verification **BLOCKED on B-7b**.
- **Branch:** `chore/autonomous-foundation-v1` (not merged into `main`)
- **Implementation commit:** `1758353` (docs commit follows)
- **Objective:** a complete, usable auth experience over the TASK-006A
  Supabase verifier.

## 1. Mission status

PARTIAL. Every screen, the full session lifecycle (establish → verify →
refresh → clear), logout, authenticated navigation and server authorization
are implemented and tested. The only unfinished criterion is the live
positive path (register → confirm → sign in with a real account), which is
blocked by missing owner prerequisites, not by code: the project still has
zero Auth users and neither `SUPABASE_TEST_EMAIL` nor
`SUPABASE_TEST_PASSWORD` exists in the secret environment (names-only check
re-run this mission). Negative paths WERE verified live against the real
provider (see §10).

## 2. Implementation summary

Supabase Auth remains the sole identity authority; no second password
store, no new dependency. A new server-only gateway drives GoTrue's REST
endpoints with the project anon accessor, and every token the provider
returns is written straight into HttpOnly cookies — the browser never sees
it. Visitors see a signed-out nav; signed-in users see an Account entry and
Sign out, rendered server-side from the provider-verified session on first
paint. The protected `/account` page checks the session before rendering,
so private content can never flash. The TASK-006A bearer-token API path
keeps working (Bearer wins; cookie is the fallback), so `owned-items` and
its tests are unchanged in behaviour.

## 3. Files created and modified

**New (server):** `web/src/server/auth/auth-gateway.ts`,
`web/src/server/auth/cookies.ts`, `web/src/server/auth/session-refresh.ts`,
`web/src/server/auth/origin.ts`, `web/src/middleware.ts`,
`web/src/app/api/v1/auth/{login,register,forgot-password,logout,update-password,establish}/route.ts`.

**New (client/pages):** `web/src/lib/auth-client.ts`,
`web/src/lib/safe-redirect.ts`, `web/src/lib/auth-nav.ts`,
`web/src/components/auth/{AuthShell,AuthNotice,PasswordField,LoginForm,RegisterForm,ForgotPasswordForm,ResetPasswordFlow,AuthCallback,LogoutButton}.tsx`,
`web/src/app/{login,register,forgot-password,reset-password,auth/callback,account}/page.tsx`.

**Modified:** `web/src/server/auth/session.ts` (optional cookie token
reader), `web/src/server/provider-access.ts` (cookie wiring, lazy gateway/
session source, `getCurrentSession`, `readRequestAccessToken`, auth rate
limiter), `web/src/app/layout.tsx` (async; passes verified auth state),
`web/src/components/shell/{AppShell,Sidebar}.tsx`,
`web/src/components/ui/BottomNav.tsx` (auth-aware 4th destination),
`scripts/check-import-boundaries.mjs` (documented Server-Component
carve-out — see §7).

**Tests (new, 72):** `tests/auth-gateway.test.ts` (10),
`tests/auth-routes.test.ts` (16), `tests/auth-session.test.ts` (7),
`tests/session-refresh.test.ts` (8), `tests/cookies.test.ts` (7),
`tests/safe-redirect.test.ts` (6), `tests/auth-ui.test.tsx` (18).

**Docs:** `task/TASK-006B-AUTHENTICATION-UI-SESSION-LIFECYCLE.md` (this
task), `handoff/TASK-006B.md` (this file),
`handoff/CURRENT_STATUS.md` (status lines only).

## 4. Routes added

| Route | Method | Purpose |
| --- | --- | --- |
| `/login` | page | Sign-in form; signed-in users redirected to `next` |
| `/register` | page | Sign-up form; confirmation-required state |
| `/forgot-password` | page | Generic recovery request |
| `/reset-password` | page | Recovery-link establish + new-password form |
| `/auth/callback` | page | Email-confirmation landing (fragment → cookies) |
| `/account` | page | Protected; verified user id + sign-out |
| `/api/v1/auth/login` | POST | Credentials → HttpOnly cookies |
| `/api/v1/auth/register` | POST | Sign-up; signed-in or confirmation-required |
| `/api/v1/auth/forgot-password` | POST | Always the same generic success |
| `/api/v1/auth/logout` | POST | Provider revoke (best effort) + cookie clear |
| `/api/v1/auth/update-password` | POST | Verified session required |
| `/api/v1/auth/establish` | POST | Fragment session → cookies (verified first) |

## 5. Authentication architecture

- **Gateway** (`auth-gateway.ts`): server-only GoTrue client over plain
  fetch (injected transport, same pattern as the TASK-006A verifier). No
  `@supabase/supabase-js` browser client, no new package.
- **Verification**: unchanged provider-side `auth.getUser()` (signature,
  issuer, audience, expiry, revocation are the provider's judgement);
  Bearer header wins, HttpOnly cookie is the fallback; identity is only
  ever the provider-returned UUID.
- **Cookies** (`cookies.ts`): `synergy_access_token` (Max-Age = provider
  `expires_in`, clamped) and `synergy_refresh_token` (7-day sliding),
  `HttpOnly; SameSite=Lax; Path=/; Secure` when HTTPS.
- **Middleware** (`middleware.ts`, edge-safe): refreshes expired/missing
  access tokens via the refresh cookie, forwards fresh cookies downstream
  through the request header, clears cookies on provider refusal, leaves
  everything untouched on provider outage. It never authorizes.
- **Pages**: `getCurrentSession()` (provider-access) reads the cookie and
  runs the same verification; the root layout passes the result into the
  shell so nav is right on first paint.

## 6. Session and logout implementation details

- **Establish**: email links carry the session in the URL fragment (never
  sent to a server by the browser). The client reads it once, POSTs to
  `/establish` (verified provider-side first), the server sets cookies,
  then the client wipes the fragment with `history.replaceState`.
- **Refresh**: timing-only `exp` decode in middleware (never trusted for
  auth); refresh on ≤60 s to expiry; outcome `fresh | refreshed | clear |
  unavailable | anonymous` (tested).
- **Logout**: same-origin required; token revoked provider-side with
  `scope=global` (best effort — a provider outage must not trap the user);
  cookies ALWAYS cleared locally; response `200 {ok:true}`; duplicate
  clicks blocked by disabled state + an in-flight ref; failure shows an
  honest error and does NOT navigate away.

## 7. Security decisions

| Risk | Decision |
| --- | --- |
| Enumeration | One generic 401 for all login failures; recovery always returns the same message; register failures never reveal a taken email |
| Token storage | HttpOnly cookies only; nothing in localStorage; bundle grep: 0 `sb_secret` / `service_role` / `grant_type` hits in `.next/static` |
| CSRF | `SameSite=Lax` + same-origin `Origin` required on cookie-setting/authenticated mutations (logout, update-password, establish); checked-if-present on credential POSTs. Origin is compared against the **`Host` header**, not `request.url` — Next dev synthesizes the URL host as `0.0.0.0` (found live this mission; regression-tested) |
| Open redirect | `safeNextPath()`: same-app relative paths only, auth screens excluded, server AND client enforce it |
| Session fixation | Fresh cookies set on every authentication event (login/register/establish/refresh); logout expires both |
| Forged identity | Body/query identity fields can never authorize — zod schemas carry only the documented fields, identity comes from the verified session |
| Rate limiting | Credential endpoints: 20/min/peer in-memory limiter (boundary docs already state its per-process limit honestly) |
| Logs | No password/token/email in any log payload (redacting logger + gateway never logs values) |
| Import boundary | `check-import-boundaries.mjs` amended with a documented carve-out: Server Components under `app/` (no `"use client"`) may import server code, because RSCs never enter the client bundle and the `server-only` marker makes any accidental client import a build error. Client components, `components/` and `lib/` remain fully checked |
| Known limit | The in-memory limiter is per-process (documented in `ratelimit.ts`); the fragment-based email flow puts tokens in the URL fragment briefly (provider's design) — mitigated by immediate establish + history wipe, never `localStorage` |

## 8. Test commands and exact results

New suites are **mocked-provider** (stubbed transport / stub session
source), labelled as such in every file header. They prove route/component
behaviour, not live provider integration.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run format:check` | 0 | Clean |
| `npm run lint` | 0 | 0 errors, 0 warnings |
| `npm run typecheck` | 0 | All workspaces |
| `npm test` | 0 | **21 files / 156 tests** (was 14/84; +72 new, 0 removed) |
| `npm run build` | 0 | Compiled; new routes dynamic; First Load JS 102–109 kB |
| `npm run secret-scan` | 0 | Clean |
| `npm run check:boundaries` | 0 | Clean, 75 files |
| `npm run android:typecheck` | 0 | Unchanged |
| `npm run check:responsive` | **NOT RUN** | Playwright not installed in this environment (script reports NOT RUN, exit 2) — recorded as a limit, not a pass |
| `npx expo export --platform android` | NOT RUN | No Android change |
| `npm audit --audit-level=high` | 1 | B-5 unchanged (not a gate) |

Coverage of the mission matrix: login valid/invalid/missing/loading/
provider-failure; registration valid/invalid-email/mismatch/weak/
confirmation-required/provider-failure; recovery valid/invalid/expired-
callback/update-failure; session restore/unauthenticated/expired/refresh-
failure/logout/protected-after-logout (cookie-clear assertions);
authorization (anonymous 401 on owned-items with and without forged
cookie, verified access, forged browser identity ignored, public pages
200); CSRF origin cases; open-redirect cases; password visibility toggle.

## 9. Build result

`npm run build` exit 0 — routes compile; `/login`, `/account` and the auth
API routes are dynamic (`ƒ`); static public routes still prerender. Pages
are dynamic by design (per-request verified session for correct first-
paint navigation) — the honest trade-off, noted here.

## 10. Live-provider evidence (this mission, dev server on :3100)

| Check | Result |
| --- | --- |
| `GET /`, `/discover`, `/communities` | 200, signed-out nav (Sign in / Create account) |
| `GET /login`, `/register` | 200, forms render |
| `GET /account` | **307** → `/login?next=%2Faccount` |
| `POST /api/v1/auth/login` fake creds | **401** `Invalid email or password.`, no `Set-Cookie` |
| `POST /api/v1/auth/register` short password | **400** field-name only |
| `POST /api/v1/auth/forgot-password` | **200** generic message |
| `POST /api/v1/auth/logout` same-origin | **200**, both cookies expired (`HttpOnly; SameSite=Lax; Max-Age=0`) |
| `POST /api/v1/auth/logout` cross-origin | **403** |
| `POST /api/v1/auth/establish` forged token | **401**, no cookies |
| `GET /api/v1/owned-items` no cookie / forged cookie + Bearer | **401** both |
| Client bundle grep | 0 `sb_secret`, 0 `service_role`, 0 `grant_type` |

**Positive path (register → confirm → sign in as a real user) was NOT
run** — `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` absent and the
project has zero Auth users. No account was created, no setting changed.

## 11. Owner actions still required (to close B-7b)

1. Create + email-confirm a test account in the SYNERGY project dashboard
   (`mailer_autoconfirm` is `false`).
2. Add `SUPABASE_TEST_EMAIL` and `SUPABASE_TEST_PASSWORD` to Settings →
   Secrets.
3. Then re-run the positive path with the runbook at the end of
   `handoff/TASK-006.md` (extended by this mission's live-negative
   evidence): sign in → cookies set → `GET /account` 200 → `GET
   /api/v1/owned-items` 200 → logout → `/account` redirects again.
4. Decide whether to rename one of the two TASK-006B labels (auth UI vs
   profile persistence) to avoid confusion.

## 12. Commit SHA

Implementation: `17583533ea7be629562c7b7db400ccd77a33f9d2`
(`feat(auth): implement login, registration and session lifecycle`).
Docs commit follows on the same branch; local == remote verified before
claiming push.

## 13. Exact next recommended task

**Run the B-7b positive-path verification** once §11 is done (runbook +
live-negative evidence above). After it passes, the profile-persistence
007B (`task/TASK-006B-profile-ownership-and-visibility.md`) can be
proposed for release — it additionally needs `DATABASE_URL` and must key
profiles by the verified `supabase_user_id`. Do not start TASK-007A.

## Design / reuse notes for the next agent

- Navy + mint tokens only (`bg`, `surface`, `primary`, …); auth layout
  lives in `components/auth/AuthShell.tsx` (max-w-md, single column,
  360–414 px friendly). Reuse `PasswordField`, `ErrorNotice`/
  `SuccessNotice`, `TextField`, `Button` — do not invent parallel styles.
- `lib/auth-client.ts` is the ONLY browser caller of auth endpoints;
  `lib/safe-redirect.ts` is the only `next` interpreter.
- Server auth entry points: `provider-access.ts` (`getCurrentSession`,
  `getLazySessionSource`, `getLazyAuthGateway`, `readRequestAccessToken`).
- Naming for the two 006B slices in future docs: "006B-auth-UI" (this
  mission) and "006B-profile" (the Neon persistence task).
