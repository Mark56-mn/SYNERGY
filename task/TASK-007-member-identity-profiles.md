# TASK-007 — Member Identity & Profiles

Status: **IMPLEMENTED — ACCEPTANCE PASS INCOMPLETE (2026-11-08)** on the isolated Neon branch `br-steep-field-b3nti5ov` — schema and migration applied, onboarding, profile view/edit, public/private enforcement, API and UI shipped, with 199 tests plus 12 live-database checks. A service-only acceptance pass verified the exact remote HEAD `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`, all runnable gates, local production rendering and privacy behaviour. **No TASK-007 Vercel Preview could be deployed or inspected from the agent environment** (logged-out Vercel CLI, no token, no `.vercel/` linkage). Design-board fidelity remains **unverified** (B-9), `check:responsive` is **NOT RUN**, and the Android authenticated onboarding/profile checks are **OWNER TEST REQUIRED**. §10 records the earlier blocked run, §11 records the unblock, §12 records implementation, and §13 records the acceptance pass; `handoff/TASK-007.md` holds the detailed evidence.
Priority: P0 — first persistent member-facing product capability after authentication.
Branch: `task/TASK-007-member-identity-profiles`
Base: `6a10d64e639115753ba595e5f807151db2363c49` (`task/TASK-006C-deployment-experience-consistency`)
Scope: Web-first, responsive member identity and profile persistence. Preserve the existing Android foundation; do not expand Android feature scope unless shared contracts require a safe compatibility update.

## 1. Mission objective

Turn the verified email-authenticated account into a real SYNERGY member identity with a durable profile. After registration, a member must have a unique public username and a usable profile that they can view and edit. Other visitors must be able to view only the profile information permitted by the member's privacy settings.

This is a combined, end-to-end identity slice: inspect the existing architecture and normative product/design sources; implement the smallest correct database schema and migration; securely link profile records to the authenticated Supabase Auth identity; implement onboarding, profile read/edit screens and APIs; enforce authorization and privacy server-side; and prove persistence and isolation with tests.

The owner has now confirmed that a genuine test account can successfully sign in and sign out on the current Vercel Preview. Record this as owner-observed live authentication evidence, not as a substitute for automated integration tests. Current Preview evidence: deployment `dpl_7CWeXAL4gQPWbD2ovnSTosNG92Rq`, URL `https://synergy-1ayluu193-drop2.vercel.app`, branch `task/TASK-006C-deployment-experience-consistency`, commit `6a10d64e639115753ba595e5f807151db2363c49`, READY. Production and `main` remain untouched.

## 2. Mandatory source and design audit — do this before coding

Read and reconcile:
- `AGENTS.md`
- `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` (normative product source)
- `MASTER_BLUEPRINT.md`
- `DECISION_REGISTER.md`
- `MVP_SCOPE.md`
- `SYSTEM_ARCHITECTURE.md`
- `DESIGN_SYSTEM.md`
- `SECURITY_RULES.md`
- `QUALITY_GATES.md`
- `ROADMAP.md`
- all current `task/TASK-006*` files and `handoff/*` records
- existing database package, Drizzle setup, auth/session gateway, route wrappers, authorization helpers, design tokens, shared domain schemas and profile UI components.

**Find and inspect the original SYNERGY UI design references/screenshots already supplied with this project.** Two reference boards are available in the project conversation attachments: `image_471bde6f.jpg` (dark navy SYNERGY board with Homepage, Services, Creation Hub, Market and Profile/Me screens; file ID `file_00000000629081f4842439e176a3a035`) and `image_d8ec3e9b.jpg` (expanded app-flow board with profile, saved/downloaded videos, services marketplace, service details, settings/privacy/security and app icon; file ID `file_00000000af3481f4a0e14d0c95d94b57`). In the current working container they are mounted at `/mnt/data/image_471bde6f.jpg` and `/mnt/data/image_d8ec3e9b.jpg`. Inspect these actual images, especially the **Profile (Me)** screen in the dark navy board and the light profile screen in the expanded board. Also search tracked repository files and asset directories for the canonical copies; record exact repository paths if present. If the agent runtime cannot access the attachments, explicitly record that limitation and search the repository rather than asking the owner to upload them again.

For the profile slice, the reference establishes: dark navy background/surfaces; mint/teal accent and active-tab treatment; compact top bar with settings and Edit Profile; centered avatar with member identity and short bio; following/follower/like statistics; and a horizontally switchable content area/tabs. Treat these as visual reference cues, not authorization to implement follower/like counts or Videos/Services/Saved/Market content in TASK-007. Use honest empty/demo states for tabs whose backing features are not implemented. Preserve the existing navy + mint design tokens and accessibility/responsive patterns; do not invent a different profile design or redesign unrelated pages.

Before implementation, write a concise audit/design mapping into this task file or `handoff/TASK-007.md`: source path → observed design rule → implementation location.

## 3. Existing behavior to preserve

- Supabase Auth is the identity authority; email/password sign-in and sign-out already work in the owner's Preview test account.
- Neon PostgreSQL is the application data store; use the existing database access and Drizzle migration conventions.
- The existing secure server-side session model, HttpOnly cookies, auth refresh, CSRF same-origin protections, route wrappers, rate limits and deny-by-default authorization remain authoritative.
- Never trust a browser-supplied user ID, role, owner ID or account status. Derive the authenticated subject from the verified server-side session.
- Keep current navigation, general Nigeria-first product identity, dark navy + mint tokens, accessibility and responsive patterns.
- Do not rewrite authentication or create a second password/account store.
- Existing demo profiles/content must remain clearly marked as demo until a later task replaces demo feed content; do not silently present fictional records as real users.

## 4. Scope — implement as one coherent vertical slice

### A. Database and identity linkage
1. Audit the actual Neon/Drizzle setup, existing schemas and migration scripts before adding anything.
2. Create the minimum durable member profile table linked to the verified Supabase Auth subject using the architecture's approved external-identity key type. Do not create duplicate credentials or store passwords.
3. At minimum support:
   - stable internal profile ID;
   - unique, normalized username/handle with database-enforced uniqueness and documented allowed characters/length;
   - display name;
   - optional bio with bounded length;
   - optional avatar image URL (validated/allowlisted according to existing conventions; URL only for this slice, no upload/storage integration);
   - profile visibility (public/private) using the normative blueprint's vocabulary;
   - created/updated timestamps.
4. Add required indexes, constraints, foreign-key behavior and migration rollback/forward guidance consistent with repository conventions.
5. Make profile creation idempotent and safe under concurrent registration/onboarding requests. A retry must not create duplicate profiles or allow username races.
6. Do not make a risky schema assumption: inspect actual auth subject format and existing types. Document any necessary mapping.

### B. Registration completion and onboarding
1. After a verified account's first authenticated visit, detect whether a profile exists.
2. If missing, guide the member through a small, accessible profile setup flow: username and display name are required; bio/avatar/privacy are optional where appropriate.
3. Check username availability server-side and enforce uniqueness at the database layer; handle conflicts gracefully without leaking another member's private data.
4. Ensure an interrupted onboarding flow can resume. Do not mark it complete until the profile transaction succeeds.
5. Do not change Supabase Auth settings, create users, auto-confirm email, or send credentials to any external service.

### C. Profile view and edit
1. Build the authenticated member's own profile page and edit form.
2. Build a public profile route resolvable by username; display only fields allowed by the profile's visibility/privacy policy.
3. Implement server-side read/update APIs or server actions using the existing API conventions.
4. Validate all inputs on the server using shared schemas; normalize usernames consistently.
5. Return safe, stable error codes for missing session, invalid input, username conflict, not found and forbidden/private profile.
6. Do not expose Auth provider tokens, email addresses, internal IDs or private fields in public profile responses unless explicitly approved by the normative blueprint.
7. A member may update only their own profile. Attempts to update another profile must be rejected even if the caller tampers with route/body IDs.
8. Add appropriate loading, empty, validation, conflict, error and success states; never display a success state before the database confirms the write.

### D. Privacy foundation
- Public profiles may be viewed by unauthenticated visitors only to the extent permitted by the normative product decisions.
- Private profiles must not leak bio/avatar/other protected profile fields through HTML, JSON, metadata, search results or error messages.
- Enforce visibility in server-side data-access/service boundaries, not merely by hiding UI.
- Keep the implementation limited to profile-level public/private visibility and any field-level rules already explicitly CONFIRMED in the normative blueprint. Do not invent additional privacy modes or broaden scope.
- Add cross-member tests proving private profile data is not disclosed and profile ownership cannot be bypassed.

### E. Design fidelity and responsive behavior
- Use the exact original design references found in §2 and the existing shared design tokens/components.
- Keep navy + mint, existing typography, component radii, spacing, buttons, form controls and navigation patterns.
- Make profile and onboarding screens work at 360px and 414px Android widths plus desktop.
- Preserve accessible labels, keyboard flow, visible focus, semantic headings, and appropriate error announcements.
- Do not redesign unrelated pages or replace the shell.

## 5. Explicit non-scope

Do not implement:
- social post creation/publishing/feed persistence (planned TASK-008);
- follow/friend connections (TASK-009);
- likes/comments/reactions (TASK-010);
- communities backend (TASK-011);
- notifications (TASK-012);
- messaging (TASK-013);
- avatar file upload, Cloudinary integration or media processing (URL-only placeholder/profile image field for now);
- payments, monetization, advertising, business storefronts, bookings or service listings;
- phone OTP, MFA, social login, account recovery redesign or changes to Supabase Auth settings;
- admin dashboards, moderation workflows, analytics or recommendation systems;
- broad dependency upgrades, paid infrastructure or GitHub Actions.

If a required prerequisite is absent, stop at a safe interface and document the blocker; do not fake persistence or successful operations.

## 6. Security and data protection requirements

- Authentication must be resolved server-side through the existing verified session.
- All profile reads and writes must use the existing server-only DB boundary and authorization helpers.
- Validate and normalize every untrusted input at the server boundary.
- Database uniqueness and foreign keys are authoritative; preflight availability checks are advisory only.
- Prevent IDOR, mass assignment, cross-user writes, username enumeration through private records, and private-profile data leakage.
- Use explicit field allowlists for public profile DTOs; never serialize raw database rows.
- Do not return internal auth subject, email, tokens, secrets, stack traces or DB errors.
- Apply rate limiting to username availability and profile mutations using existing conventions.
- Avoid logging profile bio/avatar URLs or other unnecessary personal data.
- No service_role in browser code, no secret values in logs/commits, no new credential storage.
- Use transactions for profile creation/update where needed; ensure concurrent requests cannot violate invariants.
- Add tests for unauthenticated access, user A vs user B, tampered IDs, private profile responses, username normalization/collision, idempotent onboarding, and validation failures.

## 7. Expected implementation areas (confirm after repository audit)

Likely areas include:
- `db/` schema and migration files;
- `packages/domain/` shared profile contracts and validators;
- `web/src/server/` profile repository/service and authorization boundary;
- `web/src/app/api/v1/` profile/onboarding routes following existing patterns;
- `web/src/app/` onboarding, own profile, edit profile and public username route;
- existing profile components and shared UI primitives;
- unit, integration and browser tests;
- `task/TASK-007-member-identity-profiles.md`;
- `handoff/TASK-007.md` and `handoff/CURRENT_STATUS.md`.

Do not create these directories/files blindly; audit and adapt to existing structure.

## 8. Quality gates and acceptance evidence

Run and record exact commands, exit codes and results:
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run secret-scan`
- `npm run check:boundaries`
- `npm run verify`
- `npm run check:responsive` when browser dependencies are available; otherwise record the exact blocker and a genuine browser-based substitute.
- Run database migration against an isolated/test database or approved non-production environment. Never run destructive migrations against production.
- Test actual Neon persistence and the real authenticated request path where available; clearly separate live integration tests from mocks.
- Browser-check onboarding, own profile, edit profile and public/private profile behavior at 360×800, 414×896 and desktop 1280×800/1440×900.
- Confirm no horizontal overflow, no console/runtime errors, no private fields in page source/network payloads, and correct navigation after login/logout.
- Verify Preview deployment for the exact final branch commit if existing Vercel access allows. Preview only; never Production.
- Run `npm audit --audit-level=high`; report existing B-5 advisories accurately and do not perform broad upgrades within this task.

**Definition of done:**
1. A newly authenticated member can complete onboarding and receives exactly one persistent profile.
2. Existing authenticated test member can be linked/bootstrapped safely without duplicate account/profile creation.
3. Member can view and edit their own profile; changes survive refresh and a new session.
4. Public profile URL works and exposes only allowed public fields.
5. Private profile data is inaccessible to unauthorized visitors and other members.
6. User A cannot read/update User B's private profile or mutate User B's profile by changing IDs.
7. Username normalization/uniqueness is enforced under concurrent writes.
8. Original UI design references have been inspected and mapped; implementation follows them with no unexplained visual divergence.
9. All applicable gates pass or have explicitly documented blockers; test evidence distinguishes mocked vs live.
10. Task and handoff documents record actual branch/commit, changed files, migration, design reference paths, tests, preview and next task ID.

## 9. Branch, approvals and handoff rules

- Work only on `task/TASK-007-member-identity-profiles`.
- Base exactly on `6a10d64e639115753ba595e5f807151db2363c49`; do not merge, rebase onto, push to or modify `main`.
- Do not promote Preview to Production.
- No paid resource provisioning, no Auth configuration changes, no production DB migration, no broad dependency upgrades.
- Preserve task-by-task workflow. After implementation, update this task file, `handoff/TASK-007.md`, and `handoff/CURRENT_STATUS.md`.
- Include a clear handoff for TASK-008 Social Publishing, but do not begin it.
- Leave a clean working tree and report exact commit SHA and push status.

## 10. Execution record — 2026-11-08 (BLOCKED before implementation)

Stage 1 of §2 was completed; per the rule in §5 that a missing prerequisite
must be documented rather than faked, stages §4A–§4E did not start.

### 10.1 Prerequisite checks (presence only; no value read)

| Check | Result |
| --- | --- |
| `DATABASE_URL`, `NEON_DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_DB_URL` in the environment | all **missing** |
| `.env.local` and `web/.env.local` | present, contain `APP_ENV`, `APP_ORIGIN`, `SUPABASE_AUTH_URL`, `SUPABASE_AUTH_ANON_KEY`, `MEDIA_PROVIDER_ADAPTER`, `LOG_LEVEL` — **no `DATABASE_URL`** |
| `db/drizzle.config.ts` | `schema: []`; `db/migrations/` absent |
| `npm run db:generate` | exit 1 (no schema files — as designed) |
| `/mnt/data/image_471bde6f.jpg`, `/mnt/data/image_d8ec3e9b.jpg` | **absent**; `/mnt` is empty |
| Any committed design/reference image | none (no image files in tracked source) |

Provisioning Neon is a paid-infrastructure decision (`DECISION_REGISTER.md`
D-013 is RECOMMENDED DIRECTION, not CONFIRMED) and is outside this task's
authority; switching the store to the existing Supabase project's Postgres would
overturn a recorded architecture decision. Both are owner decisions.

### 10.2 Design mapping (from this spec's written description — not fidelity-verified)

The boards could not be inspected. Mapping of the cues described in §2 to the
existing implementation, to be re-verified once the images are committed:

| Cue | Existing expression | Where it applies |
| --- | --- | --- |
| Navy background/surfaces | `bg-bg`, `bg-surface`, `border-border` tokens | profile, onboarding, edit pages |
| Mint accent / active tab | `tone="primary"`, mint `primary` token, `Tabs` active state | Edit Profile, Save, availability states |
| Compact top bar (settings, Edit Profile) | shell `Sidebar` (desktop) + `BottomNav` (mobile); no profile-local bar yet | new profile header |
| Centered avatar, identity, bio | `Avatar size="xl"`, `h1`, `@handle`, `text-ink-muted` bio in `ProfileView` | reuse with real values, drop the demo badge |
| Follower/like statistics | `dl` currently labelled `(demo)` | keep shape, honest values only |
| Content tabs | `Tabs` (Posts/About/Media) with `role="tabpanel"` | empty states, not fake content |
| Unbuilt actions | Follow/Message use `aria-disabled` + `aria-describedby` | same pattern for future actions |

### 10.3 Outcome

No schema, migration, API route, component, test, dependency or environment
variable was added. Gates that could run on a documentation-only tree passed
(`format:check`, `lint`, `typecheck`, `test`, `build`, `secret-scan`,
`check:boundaries`, `verify`); `check:responsive` remains NOT RUN (no local
browser libraries, no root). Handoff: `handoff/TASK-007.md`.

### 10.4 Unblock (two owner steps)

1. Provision an isolated **non-production** Postgres and expose `DATABASE_URL`
   in approved secret storage (and `web/.env.local` for local runs).
2. Commit the two reference boards under `docs/design/`.

Then §4A–§4E can proceed as specified, with no further decisions required.


## 11. Owner-approved unblock update — 2026-11-08

The prior §10 blocker assessment is historical and has been superseded for database provisioning. The connected Neon account contains the existing project **Synergy** (project `ancient-band-38052550`), PostgreSQL 18, database `neondb`. The project has an existing production branch (`br-damp-butterfly-b3f0r4v8`); that branch was not modified.

With owner approval to proceed, an isolated task branch was created from the production branch HEAD:
- Branch: `task-007-member-identity-profiles`
- Branch ID: `br-steep-field-b3nti5ov`
- State: **ready**
- Compute: 0.25 CU min / 0.25 CU max
- No schema or data changes have been applied.
- A pooled PostgreSQL connection string was generated for this task branch. Its privileged value is intentionally not recorded in this repository, handoff, chat, or logs.

**Remaining connection step:** add the task-branch connection string as `DATABASE_URL` in the FreeBuff agent's approved secret/environment-variable store, and make it available to local web commands as `web/.env.local` (gitignored). Never paste the value into a mission prompt, source file, GitHub, or chat. Do not use the production branch connection string. If the runtime cannot receive secrets securely, stop and ask the owner to add it through FreeBuff's secret UI.

**Design references:** the two original boards are available in the current ChatGPT project working files, but are not yet present in the FreeBuff container or tracked repository. Do not claim they have been inspected by the agent until the agent can open them. Preserve B-9 as a design-access blocker; use the repo's documented design tokens meanwhile and do not invent fidelity claims.

Next: once the owner has securely added `DATABASE_URL` to FreeBuff, resume at §4A. Verify connectivity without printing the URL or credentials, confirm the branch identity is `br-steep-field-b3nti5ov`, generate and test migrations only on that isolated branch, and continue the TASK-007 vertical slice. Do not run schema changes on `production`, change Supabase Auth, merge to `main`, or promote Production.

## 12. Execution record — 2026-11-08 (IMPLEMENTED)

The owner provisioned the isolated Neon branch and exported `DATABASE_URL`, so
§4A–§4E were implemented in one vertical slice. Full evidence lives in
`handoff/TASK-007.md`; the essentials:

- **Target verified before any write**: `neon.branch_id` =
  `br-steep-field-b3nti5ov`, `neon.project_id` = `ancient-band-38052550`,
  database `neondb`; the branch was empty (0 user tables, no Drizzle history).
  The connection string was never printed.
- **§4A**: `web/src/modules/profile/schema.ts` — `profiles` keyed by the
  Supabase Auth subject (UNIQUE), unique normalised `username`, display name,
  bounded bio, URL-only avatar, `profile_visibility` enum (`public`|`private`),
  timestamps, CHECK constraints. Migration `db/migrations/0000_nappy_vapor.sql`
  applied with `npm run db:migrate` (exit 0).
- **§4B**: idempotent onboarding (`ON CONFLICT (identity_id) DO NOTHING` + read
  back); a lost handle race is a 409, not a second account.
- **§4C**: own-profile `GET`/`PATCH`, public `GET /api/v1/profiles/[username]`,
  `/onboarding`, `/profile`, `/profile/edit`, and `/u/[handle]` resolving real
  members with demo fallback still labelled demo.
- **§4D**: private profiles answer **404** to everyone but the owner; public
  responses use a four-field allowlist; identity always comes from the verified
  session.
- **§4E**: `MemberProfileView`/`ProfileForm` reuse navy+mint tokens, `Avatar`,
  `Badge`, `Tabs` and the `aria-disabled` reserved-action pattern. Follower/like
  counts are deliberately absent rather than fabricated. **No fidelity claim** —
  the boards remain inaccessible (§5 of the handoff; B-9).
- **Gates**: format, lint, typecheck, test (25 files / 199 tests), build,
  secret-scan, boundaries and `verify` all exit 0; `db:generate` 0;
  `db:migrate` 0; live check 12/12. `check:responsive` still cannot start
  (no Chromium libraries, no root) — **not run, not claimed**.
- **Privacy defect found and fixed** (`3eb4217`): the public page returned the
  raw repository record to the view, so development's async-debug payload could
  carry the auth subject and private fields into a 404 response. The loader now
  converts to an allowlisted DTO before returning; production payloads were
  re-verified clean.
- **Remaining limitations**: no browser viewport pass; no agent-run signed-in
  onboarding (owner holds the session); avatar is a URL field only; visibility
  is binary until the follow graph lands; account erasure is out of scope.

Next task: **TASK-008 Social Publishing** (see `handoff/TASK-007.md` §9).

## 13. Final acceptance pass — 2026-11-08 (ACCEPTANCE PASS INCOMPLETE)

The remote branch was fetched and verified before any changes. Local HEAD and fetched remote HEAD were both `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`, with no divergence and a clean tree. All runnable gates pass on this exact tree: `format:check` 0, `lint` 0, `typecheck` 0, `test` 0 (25 files / 199 tests), `build` 0, `secret-scan` 0 (236 tracked files), `check:boundaries` 0 (88 files), `db:generate` 0 with no schema changes, and `verify` 0. The isolated Neon branch was re-verified (`neon.branch_id` = `br-steep-field-b3nti5ov`, project `ancient-band-38052550`, database `neondb`, `drizzle.__drizzle_migrations` contains `0000_nappy_vapor`, and `public.profiles` existed with 0 rows before the live check); `node scripts/profile-live-check.mjs` again passed **12/12** and left 0 rows.

Privacy evidence was re-run against seeded isolated-branch rows. Production rendering returned **200** for the public profile with bio present and **0 occurrences** of `identityId`, **404** for the private profile with **0 occurrences** of its bio/display name/`identityId`, **200** for the labelled demo profile, the four-field public API DTO, **404** for the private API, and 307 authenticated redirects for `/onboarding`, `/profile`, and `/profile/edit`. Development output still exposes awaited repository values in async-debug frames for the public page, but this is a development-only diagnostic channel; production output was clean. Browser-supplied identity values cannot override the verified session in the implementation, and the owner-specific profile data is exposed only to the owner. A genuine signed-in owner session was not available to the agent.

`npm run check:responsive` exited **2 — NOT RUN** because Playwright is unavailable in the agent VM, so no viewport claim is made. `npm audit --audit-level=high` exited **1**, with the unchanged B-5 set of **19 vulnerabilities (2 critical, 3 high, 14 moderate)**. No design-board images were found under `docs/design/` or elsewhere in the tracked repository, so design fidelity remains unverified (B-9).

### 13.1 Vercel Preview

**BLOCKED / NOT RUN from the agent environment.** No Vercel session exists (`npx vercel whoami` → “Logged out.”), no `VERCEL_*` variables were present, and there is no `.vercel/` linkage. No deployment ID, Preview URL, build log, or deployed SHA can be claimed. The exact intended deployment is HEAD `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c` on `task/TASK-007-member-identity-profiles` as Preview only. Do not promote Production.

### 13.2 Owner Android acceptance — OWNER TEST REQUIRED

1. Open the exact Preview URL on Android.
2. Sign in with an existing test account or register a test account if needed.
3. Complete onboarding with a unique username and display name.
4. Add a short bio and save.
5. Open the profile and confirm the saved details appear.
6. Edit the bio and save again.
7. Refresh and confirm the change remains.
8. Sign out and sign back in.
9. Confirm the same profile and edits remain.
10. While signed out, open the public profile URL and confirm only the approved public fields appear.

If the account is already onboarded, do not create a duplicate profile. With a second test account, set its visibility to `private`, open it from the first account or signed out, and confirm **404** with no private bio/identity data in the response. Do not report passwords, cookies, tokens, or secret values.

### 13.3 Remaining blockers

1. Deploy/inspect exact HEAD as a **Vercel Preview** using authenticated Vercel access; record deployment ID, URL, and deployed SHA.
2. Complete the owner Android acceptance checklist.
3. Supply `docs/design/image_471bde6f.jpg` and `docs/design/image_d8ec3e9b.jpg`, then run real-browser checks at 360/414/1280/1440 px.

TASK-007 is not labelled accepted until those owner-side items are complete. Do not start TASK-008, merge `main`, change Supabase Auth, run a production migration, or promote Production in this mission.
