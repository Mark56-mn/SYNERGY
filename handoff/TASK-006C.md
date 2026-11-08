# TASK-006C — Deployment and experience consistency handoff

- **Task ID / title:** TASK-006C — Deployment and Experience Consistency
- **Status:** **PARTIAL (2026-11-08).** Code and gates complete; **Workstream A
  BLOCKED** — the owner's preview URL is now known but sits behind Vercel
  Authentication and still cannot be tied to a commit from this environment;
  live positive sign-in **BLOCKED on B-7b**.
- **Branch:** `task/TASK-006C-deployment-experience-consistency` (never merged
  into `main`, never promoted to Production)
- **Starting commit:** `c312829` (task specification commit, base `a5766de`)
- **Implementation commit:** `0e97fa8` (`fix(web): always render auth forms on
  unconfigured builds`)
- **Docs commit:** `6a10d64` (`docs(task): record TASK-006C implementation, evidence and blockers`)
- **Objective:** one consistent, truthful Nigeria-first preview experience.

## 1. Mission status

| Workstream | Status | Why |
| --- | --- | --- |
| A — deployment investigation | **BLOCKED (URL known, still unverifiable)** | Owner supplied `https://synergy-1ayluu193-drop2.vercel.app`. It is guarded by Vercel Authentication: every path answers `302` to `vercel.com/sso-api` and the API returns `401 "Protected deployment"`, so neither an anonymous visitor nor this session can load the app. No deployment ID or branch/commit mapping is obtainable without Vercel access. |
| B — branding and demo-content cleanup | **PASS** | Zero forbidden location strings in any user-facing source tree; regression scan added. |
| C — authentication experience | **PASS for rendering/validation; PARTIAL for live sign-in** | Forms always render, are fully labelled and validated in a real browser; live negative path verified against the real provider. Live *positive* sign-in remains unverifiable (B-7b: zero Auth users, no test account). |
| D — homepage, navigation, feature states | **PASS** | Home/nav/composer copy is truthful and city-free; composer still preview-only and never claims a publish. Sidebar notice reworded to match the auth reality. |
| E — quality and independent verification | **PASS with one unavailable gate** | Every required gate ran and passed; `check:responsive` cannot run in this VM (no local browser libraries, no root) and is reported as NOT RUN, with cloud-browser viewport checks as the substitute evidence. |

TASK-006C is therefore **PARTIAL**, not DONE: the acceptance criterion
"newest intended Preview deployment is READY and tied to the final task-branch
commit" cannot be satisfied from this environment.

## 2. What actually changed

### 2.1 Authentication screens no longer hide their fields (Workstream C)

`/login`, `/register`, `/forgot-password` and `/reset-password` previously
rendered a "provider not configured" panel *instead of* the form when
`SUPABASE_AUTH_URL` / `SUPABASE_AUTH_ANON_KEY` were absent. That is exactly
what the owner saw as "missing inputs". All four pages now always render
their real controls; when Auth is unconfigured the existing auth API answers
with the accurate configuration error **on submit**, so nothing is faked and
no control disappears.

- `/login` still redirects an already-signed-in visitor to the validated
  `next` destination (server-side `getCurrentSession()`), and still forwards
  the `confirmed` / `reset` notices.
- `/register` still redirects a signed-in visitor home.
- `/reset-password` still skips the recovery-link step when a session already
  exists; without one it shows the establish/verification path and then the
  form. An unusable link renders the honest "invalid or expired" state.
- No second password store, no new dependency, no change to the Supabase
  verifier, the HttpOnly cookie session model, the CSRF same-origin check or
  the rate limiter.

### 2.2 Remaining location-specific copy removed (Workstream B)

- `android/app/(tabs)/services.tsx`: "Services and products from providers in
  **Ibadan** will be discovered here…" → general "from individual and
  business providers". This was the last city string in the Android surface.

### 2.3 Gate repair and regression scan (Workstreams B + E)

- `scripts/check-responsive.mjs` pointed at `/communities/bodija-traders`, a
  slug renamed by `a5766de` to `independent-traders`; the gate would have
  failed on a stale URL rather than on a real regression. Fixed.
- `tests/no-location-branding.test.ts` (new) walks `web/src`, `android/app`,
  `packages` and `scripts` and fails on `Ibadan`, `Bodija`, `Dugbe`, `Akobo`,
  `Jericho` or `Ring Road`. Historical/normative records (`docs/`, `task/`,
  `handoff/`, MASTER_BLUEPRINT, DECISION_REGISTER) are deliberately outside
  the scan: D-001 still records Ibadan as the CONFIRMED controlled launch
  market, and rewriting the record would falsify the decision history.

### 2.4 Truthful shell copy (Workstream D)

`web/src/components/shell/Sidebar.tsx`: the footer notice said "no account …
is stored", which became false when TASK-006B shipped real accounts. It now
reads "Community preview. Profiles and posts are fictional demonstrations —
no profile, message or listing is stored yet." The demo banner, the composer
("Create a post (preview)", "Layout preview only. Posting arrives with the
content task — nothing you type here is saved or published.") and the
disabled Post action were already truthful and were left as they are.

## 3. Files changed

| File | Change |
| --- | --- |
| `web/src/app/login/page.tsx` | form always rendered; server-side redirect kept |
| `web/src/app/register/page.tsx` | form always rendered; redirect kept |
| `web/src/app/forgot-password/page.tsx` | form always rendered |
| `web/src/app/reset-password/page.tsx` | flow always rendered (`hasSession` passed through) |
| `web/src/components/shell/Sidebar.tsx` | account/notice wording corrected |
| `android/app/(tabs)/services.tsx` | last location-specific service copy generalised |
| `scripts/check-responsive.mjs` | stale community slug fixed |
| `tests/no-location-branding.test.ts` | new repository-wide regression scan |
| `handoff/CURRENT_STATUS.md` | stale auth/status/location statements reconciled |
| `task/TASK-006C-deployment-experience-consistency.md` | status + acceptance evidence |
| `handoff/TASK-006C.md` | this handoff |

No schema, API, migration, dependency or configuration change.

## 4. Workstream A — deployment truth: BLOCKED

Checked this mission:

- `.vercel/` — absent; `vercel.json` — absent.
- `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — absent from the
  environment (names only; no value was read or printed).
- `npx vercel whoami` → `Logged out.`
- No deployment URL, deployment ID, project ID or Git linkage is recorded
  anywhere in the repository.

**Consequence:** the preview URL, deployment ID, deployment branch and commit
deployed in the owner's recording **cannot be identified from this
environment**, and no preview could be queued or corrected. Because this is
an external hosting account, no attempt was made to create one.

**Why the owner's recording showed the old content (most likely, unverified):**
the recording predates `a5766de`/`7b48957`, or it shows a preview built from a
branch that does not contain those commits — e.g. the Production branch, or an
older preview URL left open in the browser. This cannot be confirmed without
deployment history access, so it is stated as a hypothesis, not a finding.

### 4.1 Owner-supplied preview URL, probed (2026-11-08)

The owner later supplied `https://synergy-1ayluu193-drop2.vercel.app/account`.
It was probed read-only, with no credentials and no secret value:

| Probe | Result |
| --- | --- |
| `GET /account` | `302` → `https://vercel.com/sso-api?url=…` plus a `_vercel_sso_nonce` cookie — **not** the app's own `307` → `/login` |
| `GET /login`, `/register`, `/` | `302` with a 263-byte body each; the app never rendered |
| `POST /api/v1/auth/login` (fake credentials) | `401 {"protection":{"vercel_auth_enabled":true},"error":{"message":"Protected deployment"}}` |
| `GET /` headers | `server: Vercel`, `x-vercel-id: sfo1::…`; protection answers before Next.js, so no `x-vercel-cache`/`x-matched-path` |
| Cloud browser, no Vercel session | `https://vercel.com/login?next=/sso-api?url=…` — a Vercel sign-in form |

**Findings:**

1. The deployment is real and serving HTTP, but **Vercel Authentication guards
   the whole project**. The owner is signed into Vercel, so the owner sees a
   working app; every evaluator, tester, reviewer or partner gets a Vercel
   login form instead. No anonymous check of copy, layout, auth or API is
   possible — including the acceptance checks this mission required.
2. **The deployment still cannot be tied to this branch.** No response exposes
   the Git branch or SHA (protection answers before the app), and
   `x-vercel-id` carries only the edge region and a request id. Whether this
   build contains `0e97fa8` is **unverified**. The owner's screenshot proves a
   sign-in card with Email/Password renders; that card also ships in earlier
   commits, so it is not evidence of this branch.
3. **The reported "missing inputs" symptom is not visible on this URL.** The
   screenshot shows `/account` → sign-in card with Email, Password, "Show",
   "Sign in", "Forgot password?" and "Create an account". That is consistent
   with the fix in `0e97fa8` **and** with the form-rendering branches of
   `a5766de`/`7b48957`, so it is recorded as consistency, not proof.

**Owner action to unblock (smallest step):**

1. Open the Vercel project → Deployments, and open the newest deployment for
   branch `task/TASK-006C-deployment-experience-consistency`.
2. Confirm it is built from commit `0e97fa8` (or later on this branch) and its
   state is READY; open that preview URL.
3. Alternatively grant this session Vercel access (`VERCEL_TOKEN` with
   read+deploy scope for this project) and the mission can verify/produce the
   preview itself.
4. Do not promote any preview to Production and do not change the Production
   branch.

## 5. Quality gates (recorded exactly)

Run from the repository root on the final tree (`0e97fa8` + docs):

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | 0 | dependencies restored from the lockfile (no upgrade) |
| `npm run format:check` | 0 | "All matched files use Prettier code style!" |
| `npm run lint` | 0 | clean |
| `npm run typecheck` | 0 | web + packages + android clean |
| `npm test` | 0 | **22 files / 158 tests passed** (baseline was 21/156; +2 from the new scan) |
| `npm run build` | 0 | Next production build, all auth routes compiled |
| `npm run secret-scan` | 0 | no secret material |
| `npm run check:boundaries` | 0 | import boundaries hold |
| `npm run verify` | 0 | PASS: format, lint, typecheck, tests, web build, secret scan, import boundaries; audit reported as ADVISORY (not a pass) |
| `npm run check:responsive` | **2 — NOT RUN** | Playwright 1.65 installed out of tree and Chromium 158 downloaded, but the headless shell cannot start in this VM: `libnspr4.so`/`libnss3.so`/… missing and `apt`/`sudo` are unavailable (no root). Exit 2 is the script's documented "browser unavailable" code, never a pass. |
| `npm audit --audit-level=high` | 1 | 19 vulnerabilities (14 moderate, 3 high, 2 critical) — the pre-existing **B-5** advisories, unchanged by this mission; documented in `handoff/TASK-005.md` |

## 6. Browser verification (real rendering, not HTML strings)

The VM has no working local browser, so browser checks ran through the Cloud
browser (real Chromium) against the **production build of `0e97fa8`** served
by `next start` on `0.0.0.0:3000`. Each breakpoint was produced with a real
same-origin iframe at that width, so CSS media queries evaluated at the tested
viewport, and layout was read from the rendered DOM.

| Viewport | `/` | `/login` | `/register` | `/communities` | `/account` |
| --- | --- | --- | --- | --- | --- |
| 360×800 | 200, overflow 0 | 200, overflow 0, 2 inputs | 200, overflow 0, 3 inputs | 200, overflow 0 | 307 → `/login` |
| 414×896 | 200, overflow 0 | 200, overflow 0, 2 inputs | 200, overflow 0, 3 inputs | 200, overflow 0 | 307 → `/login` |
| 1280×800 | 200, overflow 0, 8 nav links | 200, overflow 0, 2 inputs | 200, overflow 0, 3 inputs | 200, overflow 0 | 307 → `/login` |
| 1440×900 | 200, overflow 0, 8 nav links | 200, overflow 0, 2 inputs | 200, overflow 0, 3 inputs | 200, overflow 0 | 307 → `/login` |

Rendered controls (all widths):

- `/login` — `h1` "Sign in to SYNERGY"; `input[type=email]` (name `email`,
  `autocomplete=email`, label "Email"); `input[type=password]` (name
  `password`, `autocomplete=current-password`, label "Password", "Show"
  toggle); submit button "Sign in"; "Forgot password?" and "Create an
  account" links.
- `/register` — `h1` "Create your SYNERGY account"; `email`, `password`
  (`autocomplete=new-password`), `confirm-password`, submit "Create account".
- Validation, exercised in the browser: empty sign-in submit sets
  `aria-invalid="true"` on both fields, renders "Enter a valid email address."
  and "Enter your password.", and leaves both inputs visible and editable.
- No forbidden location string appears in the rendered text of any page.
- Screenshot evidence: `artifacts/006c-login.png` (untracked working artifact —
  not committed; 1280-wide Cloud browser, `/login`).

Honest limitation: the iframe method tests layout/media queries and rendered
DOM, not the browser chrome of a physical 360px phone; `check:responsive`
remains the gate that covers pixel behaviour and it did **not** run.

## 7. Authentication checks, and what is live vs mocked

- **Live, negative (real Supabase project):**
  `POST /api/v1/auth/login` with a non-existent account →
  `401 {"error":{"code":"unauthorized","message":"Invalid email or password."}}`,
  **no `Set-Cookie`**. Generic message, no account oracle.
- **Live, live-config:** `SUPABASE_AUTH_URL` / `SUPABASE_AUTH_ANON_KEY` names
  are present in this environment, so the above 401 came from the real
  provider, not from a stub.
- **Live, positive sign-in: NOT VERIFIED — B-7b.** The project has zero Auth
  users and no owner-approved test account or `SUPABASE_TEST_EMAIL` /
  `SUPABASE_TEST_PASSWORD`. No user was created, no Auth setting changed, no
  `service_role` used.
- **Session lifecycle (cookie issue → verify → refresh → clear, CSRF
  same-origin, logout revoke):** covered by the TASK-006B suite (mocked
  transport) plus the live negative paths above. Unchanged by this mission.
- `/account` is protected before render: every viewport redirected to
  `/login` with no private content flashed.

## 8. Repository-wide location reference scan

`git grep -nIiE 'ibadan|bodija|dugbe|akobo|jericho|ring road'`:

- **`web/src`, `android/app`, `packages`, `scripts` — 0 files.** Before this
  mission the Android services copy still contained "Ibadan"; it does not now.
- Remaining hits (14 files) are records, not product surface:
  `task/TASK-006C…` (this scan's own search list), `task/TASK-004…`,
  `handoff/TASK-004.md`, `handoff/TASK-005.md`, `handoff/CURRENT_STATUS.md`
  (one labelled historical/D-001 reference), `MASTER_BLUEPRINT.md`,
  `DECISION_REGISTER.md` (D-001 "Initial controlled launch in Ibadan" —
  CONFIRMED), `README.md` (launch-market line), `docs/**` (blueprint, roadmap,
  ADR, review records), and `tests/demo-content.test.ts` (the existing corpus
  regex, which must contain the words to forbid them).
- `tests/no-location-branding.test.ts` now enforces the user-facing half of
  that rule mechanically.

## 9. Security and privacy review

- No secret value was read, printed or committed; environment inspection was
  name-only.
- **Incident requiring owner action:** the owner shared a screenshot
  containing a real account email and password in plain text. No value was
  copied, used, logged or committed, and no sign-in was attempted with it.
  That password must be treated as compromised and rotated, and a personal
  address should not become the project's test identity.
- No auth architecture change: Supabase remains the sole identity authority,
  sessions stay in HttpOnly cookies, browser-supplied ids/roles are never
  trusted, and no second password store was added.
- New browser code sends nothing new; the only added runtime paths are the
  already-existing auth API calls on submit.
- The new test reads source files from disk only; it executes no product code.

## 10. Blockers and owner actions

1. **B-7b (P0 for auth confidence):** provide an owner-approved **dedicated
   test account** with a confirmed email, stored as `SUPABASE_TEST_EMAIL` /
   `SUPABASE_TEST_PASSWORD` in approved secret storage, so the live positive
   path can be verified once without any credential appearing in chat, a
   screenshot or a command. Do not enable auto-confirm and do not create users
   for this.
2. **Workstream A (P0 for the owner's viewing problem):** the preview URL is
   now known (`https://synergy-1ayluu193-drop2.vercel.app`) but is guarded by
   Vercel Authentication. Either (a) relax Deployment Protection for previews
   (Vercel → project → Settings → Deployment Protection) so the link is
   shareable, or (b) accept that only signed-in Vercel team members can view
   it. Then confirm in Deployments that the newest preview on
   `task/TASK-006C-deployment-experience-consistency` is READY at `0e97fa8` or
   later. This is a hosting/security setting, so it needs the owner's explicit
   decision; this mission changed nothing about it.
3. **B-5 (pre-existing):** 3 high / 2 critical advisories remain; they need a
   dedicated dependency mission, not an incidental upgrade here.

## 11. Recommended next mission

**TASK-007 — Member Identity and Profiles** (profile schema, creation, editing,
viewing, ownership security, API integration and tests) once the database
configuration and authorization it needs are granted. Before or alongside it,
a short owner-assisted deployment mission should close Workstream A: confirm a
READY preview for `task/TASK-006C-deployment-experience-consistency` and give
the owner one URL to bookmark.

Do not mark TASK-006C DONE on the basis of this handoff: the preview
deployment criterion is unmet.
