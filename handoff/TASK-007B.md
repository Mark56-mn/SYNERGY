# TASK-007B — Profile Navigation, Phone Photo Upload & Preview Recovery handoff

- **Task:** TASK-007B — Member Profile, Phone Photo Upload & Preview Recovery
  (`task/TASK-007B-profile-media-navigation-preview.md`, §10 records this run)
- **Status:** **IMPLEMENTED — ACCEPTANCE PASS INCOMPLETE**. Phone-gallery upload code,
  own-profile navigation and photo rendering are implemented and verified
  locally (tests + production HTML). No TASK-007B Vercel Preview could be
  deployed from the agent environment (logged-out Vercel CLI, no token, no
  `.vercel/` linkage), Cloudinary credentials are absent locally and in the
  prior Preview inventory, so live phone-gallery upload end-to-end (real
  Cloudinary round-trip) and owner Android acceptance remain
  **OWNER TEST REQUIRED**. Vercel BLOCKED cause is documented below; no real
  READY Preview deployment is claimed.
- **Branch:** `task/TASK-007B-profile-media-navigation-preview`
- **Base:** `a6241cabf92c598cedace91ed678a99d930c2fe5` (TASK-007 docs tip
  `2e8c59f` plus TASK-007B spec commit `a6241ca`)
- **Implementation commits:** see §1 (branch will be headed by the docs commit
  that closes this handoff; record it in the delivery report)
- **Database:** Neon project `ancient-band-38052550`, branch
  `br-steep-field-b3nti5ov` (`task-007-member-identity-profiles`), database
  `neondb`, PostgreSQL 18.6 — verified before every write, 0 rows after
  verification. No migration was needed or run in this task.
- **`main` / Production:** untouched. Nothing merged, nothing promoted, no
  Production migration, no Supabase Auth change, no billing/plan change.

## 1. What shipped

| Spec area | Delivered |
| --- | --- |
| §4 own-profile navigation | Mobile BottomNav and desktop Sidebar Profile now point signed-in members to `/profile` (server-resolved from the verified session; `/profile` redirects to `/onboarding` when no profile exists). Signed-out visitors get Sign in (`/login` / `/login?next=/profile`), never a demo profile. `/u/amara.makes` remains reachable as demo content from Discover, never as the Profile destination. Browser nav props now carry only a `signedIn` boolean — no user id. |
| §4 sidebar copy | Removed “no profile … is stored” footer. Sidebar footer now reads: “Profiles labelled ‘Demo’ are demonstrations. Member profiles are saved to your account and stay after you sign out.” |
| §5 photo upload | `POST /api/v1/profile/avatar-upload` (multipart `file`) with session auth, same-origin CSRF, rate limiting (10/min), magic-byte sniffing, 4 MB cap, 8000×8000 px cap, fixed Cloudinary folder `synergy/avatars/<sha256(userId)[0:16]>`, server-generated random `public_id`, server-side SHA1 signature over the allowlisted param set, and post-upload verification that the returned `secure_url` belongs to the configured cloud+folder. Returns only `{ avatarUrl }`. |
| §5 upload UX | `AvatarUpload` control: native `input type=file` `accept="image/jpeg,image/png,image/webp"` (no `capture`, so phones offer gallery/file picker), client validation (type + 4 MB), preview with Replace/Cancel, Upload button with loading/disabled state, retry error copy that promises the previous photo is untouched, and a “Photo uploaded — press Save profile” success state. `ProfileForm` now submits the confirmed URL with the regular save, so the photo is not marked saved until Save succeeds and a failed upload never overwrites the saved photo. |
| §5 rendering | `Avatar` renders the persisted HTTPS photo via `<img>` and falls back to initials when absent/unusable. `MemberProfileView` passes the stored `avatarUrl`. Stale “uploads arrive later, initials for now” copy removed. |
| §5 URL hardening | When `MEDIA_PROVIDER_ADAPTER=cloudinary`, `ProfileService` rejects any new avatar URL that is not a `res.cloudinary.com/<cloud>/image/upload/…/synergy/avatars/…` URL. In the stub/dev environment the existing HTTPS-only domain rule applies. |
| §7 tests | `tests/avatar-upload.test.ts` (13 tests) and `tests/navigation.test.tsx` (7 tests). See §6. |
| §6 Vercel | Investigation documented in §4. No deployment created, identified, or inspected — deployment remains OWNER ACTION REQUIRED. |

Supporting change: `AuthNavState` narrowed from `{ userId: string | null }` to
`{ signedIn: boolean }` so the browser never receives the verified user id in
navigation props.

## 2. Changed files

Modified:
- `packages/domain/src/users-and-profiles.ts` — added `AVATAR_MAX_BYTES` (4 MB),
  `AVATAR_MAX_WIDTH/HEIGHT` (8000), `ALLOWED_AVATAR_MIME_TYPES`; updated avatar
  comment.
- `web/src/lib/auth-nav.ts` — `{ signedIn: boolean }` only.
- `web/src/app/layout.tsx` — passes `signedIn: Boolean(session)`.
- `web/src/components/ui/BottomNav.tsx` — `getPrimaryNavItems(signedIn)`,
  `PRIMARY_NAV` no longer contains the demo profile; mobile 5th item is Profile
  (`/profile`) when signed in, Sign in (`/login`) when signed out.
- `web/src/components/shell/Sidebar.tsx` — uses `getPrimaryNavItems`; footer copy
  corrected.
- `web/src/components/shell/AppShell.tsx` — `signedIn` boolean.
- `web/src/components/ui/Avatar.tsx` — optional `src` photo rendering +
  initials fallback.
- `web/src/components/profile/MemberProfileView.tsx` — passes `avatarUrl` as
  `src`; media-tab and photo copy made honest.
- `web/src/components/profile/ProfileForm.tsx` — replaces URL text field with
  `AvatarUpload`; success now routes to `/profile`.
- `web/src/app/onboarding/page.tsx` — existing-profile redirect now `/profile`.
- `web/src/modules/profile/service.ts` — Cloudinary-backed avatar URL
  restriction on create/update.
- `web/src/server/http/errors.ts` — added `service_unavailable` (503).

Added:
- `web/src/modules/profile/avatar-upload.ts` — sniffing, dimensions, signature,
  folder, verification, signed Cloudinary uploader.
- `web/src/components/profile/AvatarUpload.tsx` — phone-gallery upload control.
- `web/src/app/api/v1/profile/avatar-upload/route.ts` — the upload endpoint.
- `tests/avatar-upload.test.ts`, `tests/navigation.test.tsx`.

No schema / migration change. No new dependency (`node:crypto` only). No new
environment variable name beyond the expected Cloudinary trio.

## 3. Database verification

- `node scripts/profile-live-check.mjs` — **12/12** on branch
  `br-steep-field-b3nti5ov`, project `ancient-band-38052550`, `neondb`,
  PostgreSQL 18.6; 0 rows after cleanup.
- `npm run db:generate` — **no schema changes**.
- Production HTML check with temporary seeded rows (then deleted):
  - `/u/accept_public` → **200**, seeded Cloudinary `avatarUrl` present in the
    `<img>` (`res.cloudinary.com/test-cloud/image/upload/synergy/avatars/abc/avatar.jpg`),
    `identityId` **0** occurrences.
  - `/u/accept_private` → **404**, private bio / display name / `identityId`
    **0** occurrences.
  - 0 profiles remained after cleanup.

## 4. Vercel Preview block — investigation

**Result: NOT RESOLVED — owner action required. No READY deployment is claimed.**

Agent-environment facts:

- `npx vercel whoami` → **“Logged out.”**
- No `VERCEL_*` credentials in this environment; no `.vercel/project.json`
  linkage exists in the worktree.
- Therefore the agent cannot enumerate the team plan, deployment list, project
  settings, or environment variables and cannot start a deployment.

Git-side facts (from the pushed branch history):

- Owner docs tip `a6241ca` is authored by `Mark56-mn <tradebetter98@gmail.com>`.
- Code commits `6108fdc`, `8241834`, `2e8c59f` (and any code commits pushed by
  the agent) are authored by `Codebuff (SYNERGY agent) <noreply@codebuff.com>`.

This matters because Vercel's private-repository collaboration rule blocks a
deployment when the **commit author cannot be associated with the Vercel
user/team**: on a Hobby team private-repo collaboration is unsupported (the
commit must be authored by the Hobby-team owner with the Git provider
connected); on a Pro team the commit author must be a confirmed team member.
The prior TASK-007 deployment `dpl_HDbsGv2K4ubZKjKBPrnAp2BThPJj` for commit
`2e8c59f` was `BLOCKED` (pre-build, empty build logs) with Vercel linking it to
project collaboration/team configuration — consistent with a Codebuff-authored
commit landing on a team whose owner Git identity is `tradebetter98@gmail.com`.
The agent will **not** rewrite authors to impersonate the owner, disable SSO
protection, upgrade the plan, change billing, or transfer ownership.

Owner action to unblock (choose in Vercel → project `synergy`, **not** the
duplicate `synergyop`):

1. Project `synergy` → **Settings → Git** — confirm the GitHub repository
   `Mark56-mn/SYNERGY` is connected to this project and the team.
2. Team → **Settings → Members** — confirm the Vercel user owning
   `tradebetter98@gmail.com` / GitHub `Mark56-mn` is a confirmed member/owner
   of team `team_ySUNql5RT7Dz4lIOVeSeI0r9`.
3. The newest commit must be authored (or re-authored/merged by the owner via
   GitHub) by that GitHub identity, **or** re-trigger the deployment from the
   Vercel dashboard after inviting/confirming the commit author per Vercel's
   “denied team integration” prompt. Do not create a duplicate project.
4. Re-trigger a **Preview** deployment from branch
   `task/TASK-007B-profile-media-navigation-preview` at its final HEAD and
   record the deployment ID, Preview URL, deployed SHA, and READY state.

Preview environment variables the owner must add (Vercel → project `synergy`
→ **Settings → Environment Variables**, scope **Preview only**, never
Production):

- `DATABASE_URL` — the isolated Neon branch connection
  (`br-steep-field-b3nti5ov`), never Production.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` —
  server-only, Preview scope.
- `MEDIA_PROVIDER_ADAPTER=cloudinary` — required to activate uploads on
  Preview (default is `stub`).
- Keep existing `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY` intact.

Until the Cloudinary trio + adapter are present on Preview, the upload
endpoint honestly returns **503** with the variable names above; it never
fakes success and the previous photo is never overwritten.

## 5. Cloudinary configuration status

| Where | Status |
| --- | --- |
| Agent environment / `.env.local` / `web/.env.local` | **Absent.** Only `MEDIA_PROVIDER_ADAPTER` (name only) present; no `CLOUDINARY_*` values. Uploads therefore return 503 in this environment — by design, not by omission. |
| Prior Vercel Preview inventory (TASK-007B spec §2) | Only `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY`; no `DATABASE_URL`, no Cloudinary variables. |
| Expected variables | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server-only) and `MEDIA_PROVIDER_ADAPTER=cloudinary`. |
| Credential handling | Secret is used only server-side for signing; never returned to the browser, never logged, never committed. The secret-scan gate passes. |

**End-to-end phone-gallery upload to a live Cloudinary account is therefore
NOT proven.** What is proven: the signed-upload plumbing with an injected
double, validation, auth/CSRF/rate-limit, failure handling, persistence of the
returned URL, and rendering of the persisted photo after refresh. A real
Cloudinary round-trip requires the owner to add the three variables above to
Preview (or local runtime) and is **OWNER TEST REQUIRED**.

## 6. Test evidence

Quality gates on the implementation tree (`npm run verify` summary):

| Command | Exit | Evidence |
| --- | --- | --- |
| `npm run format:check` | 0 | Prettier clean (after `npm run format`) |
| `npm run lint` | 0 | ESLint clean (0 errors, 0 warnings after the Avatar disable comment) |
| `npm run typecheck` | 0 | all workspaces (web + Android) |
| `npm test` | 0 | **27 files / 219 tests passed** (199 prior + 20 new: 13 avatar + 7 navigation) |
| `npm run build` | 0 | Next.js production build; `/api/v1/profile/avatar-upload` and `/profile` routes present |
| `npm run secret-scan` | 0 | clean, tracked files |
| `npm run check:boundaries` | 0 | clean |
| `npm run db:generate` | 0 | **no schema changes** |
| `node scripts/profile-live-check.mjs` | 0 | **12/12** |
| `npm run verify` | 0 | all required gates passed; audit advisory below |
| `npm run check:responsive` | **NOT RUN** | Playwright unavailable in the agent VM — exact blocker, not a pass |
| `npm audit --audit-level=high` | 1 | **19 vulnerabilities (2 critical, 3 high, 14 moderate)** — unchanged B-5 set |

New tests prove: mobile/desktop signed-in Profile → `/profile` (not demo),
signed-out → Sign in, no `/u/amara.makes` in nav, sidebar copy corrected,
avatar sniffing rejects SVG/GIF/HTML, 4 MB cap, signature determinism, opaque
per-member folders, Cloudinary-URL verification, 401/403/CSRF/503/429 on the
upload route, only `{ avatarUrl }` returned (no user id / secret), unsupported
files never reach the uploader.

Production rendering proof (§3) is separate from mocks: a seeded public
profile with a Cloudinary `avatarUrl` rendered the `<img>`, a private profile
answered 404 with zero private-data occurrences, and cleanup left 0 rows.

**Not run / not claimed:** a signed-in onboarding→upload→refresh flow against
live Supabase Auth + live Cloudinary (no owner session, no Cloudinary
credentials, no Vercel Preview in this environment) and any browser viewport
claim (Playwright NOT RUN).

## 7. Privacy and security review

- Identity for upload, profile write, and page resolution always comes from
  the verified session; no body-supplied owner/id reaches the uploader or
  repository. Folder and public_id are server-generated.
- The upload response contains only `avatarUrl`. No public_id, signature,
  secret, user id, or internal profile id is exposed in the upload response,
  public DTO, HTML/RSC payload, or browser bundle (verified by tests and the
  production HTML inspection).
- Failed upload (validation, 503, provider error, network) leaves the
  previously saved photo intact — nothing is persisted until the server
  confirms the upload and the profile Save succeeds.
- Private profiles remain 404 to non-owners; the owner DTO adds visibility
  and timestamps only for the owner.
- `AuthNavState` no longer carries the verified user id; navigation receives a
  boolean.

## 8. Remaining blockers and next actions

1. **Vercel Preview (owner):** follow §4 — confirm Git connection and team
   membership for `tradebetter98@gmail.com` / `Mark56-mn`, then re-trigger a
   Preview deployment from this branch's final HEAD. Record deployment
   ID/URL/SHA/READY state.
2. **Preview env (owner):** add Preview-only `DATABASE_URL` (isolated branch),
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
   `MEDIA_PROVIDER_ADAPTER=cloudinary` (see §4).
3. **Owner Android acceptance (OWNER TEST REQUIRED):** on the Preview,
   sign in → onboarding (unique username) → Edit Profile → choose gallery
   photo → preview → upload → Save → refresh and confirm the photo is
   displayed and persists across sign-out/sign-in → signed-out public view
   shows only approved fields → (second account) private profile = 404 with
   no private data. Do not report passwords, cookies, or tokens.
4. **Design/responsive:** supply the two original design boards (B-9) and run
   real-browser checks at 360/414/1280/1440 px.
5. **Next task:** TASK-008 Social Publishing only after owner acceptance above.
   Do not merge to `main` or promote Production in this task.
