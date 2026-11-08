# TASK-007 — Member Identity & Profiles

Status: **READY FOR IMPLEMENTATION**
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

**Find and inspect the original SYNERGY UI design references/screenshots already stored in the repository/project source files.** Search tracked files and asset directories (including design/reference/mockup/screenshot/artifact directories and image assets); identify exact paths and inspect the actual images, not only filenames. Record which original references govern profile layout, avatar/header treatment, spacing, typography, colors, navigation and mobile behavior. Compare current implementation with those references and preserve their established visual language. Do not ask the owner to upload images that already exist in the repository. Do not invent a new profile design or replace the existing navy + mint design system. If an expected reference cannot be located or is ambiguous, document the exact search and use the existing `DESIGN_SYSTEM.md` and normative blueprint as fallback.

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
