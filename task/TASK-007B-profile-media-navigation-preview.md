# TASK-007B — Profile Navigation, Phone Photo Upload & Preview Recovery

Status: READY FOR IMPLEMENTATION
Branch: `task/TASK-007B-profile-media-navigation-preview`
Base commit: `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c` on `task/TASK-007-member-identity-profiles`
Scope: Complete the real-member profile experience and make its Preview deployable. Preview only; never merge to `main`, promote to Production, or modify Production settings.

## 1. Owner-approved objective

The owner explicitly approved direct photo selection/upload from a phone gallery. Deliver one coherent, end-to-end profile usability slice:

1. A signed-in member can reach **their own real profile** from mobile bottom navigation and desktop sidebar. No demo profile may be presented as the signed-in member's profile.
2. A member can open Edit Profile, choose a photo from their Android/iOS device gallery or file picker, preview it, upload it, save it, and see the actual photo rendered on their profile.
3. Existing profile fields (username, display name, bio, visibility) remain editable and persist.
4. Demo profile routes/content remain clearly labelled as demonstrations.
5. Resolve the Vercel Preview BLOCKED state without weakening deployment protection or team security.
6. Ensure the Preview has the environment configuration needed for the profile feature, without exposing or copying secrets into GitHub, logs, chat, or client bundles.
7. Update task/handoff documentation with implementation, security decisions, tests, deployment status and next steps.

The owner's intended behavior is direct phone-gallery upload; do not substitute a URL-only field or a fake upload button.

## 2. Verified starting facts

- Repository: `Mark56-mn/SYNERGY`.
- Starting implementation commit: `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`.
- New isolated task branch has been created from that exact commit: `task/TASK-007B-profile-media-navigation-preview`.
- Existing real profile implementation is in `task/TASK-007-member-identity-profiles`; preserve its verified-session security and DB behavior.
- The current BottomNav's Profile link is hardcoded to fictional `/u/amara.makes`; signed-in mobile users get Account as the fifth item rather than their own Profile.
- Sidebar uses the same `PRIMARY_NAV`, so its Profile destination is also the demo profile. It separately has an Account link.
- Sidebar footer says no profile is stored, which is now false.
- `MemberProfileView` currently passes no `avatarUrl` to Avatar and explicitly says initials are shown; the URL is saved but not rendered.
- `ProfileForm` currently uses a plain avatar URL text field; replace this with phone-compatible image selection/upload, while preserving a graceful fallback where upload configuration is not yet available.
- Current Vercel project: `synergy`, project ID `prj_y1Kfch3yxkcV6deQBAAC6xhtRbO7`, team ID `team_ySUNql5RT7Dz4lIOVeSeI0r9`.
- Latest TASK-007 deployment `dpl_HDbsGv2K4ubZKjKBPrnAp2BThPJj` is `BLOCKED`, branch `task/TASK-007-member-identity-profiles`, commit `2e8c59f58016ab23eb13228cb8f27cf2cecb3c9c`; Vercel links the failure to project collaboration/team configuration. This is a pre-build block; build logs are empty.
- Vercel project has SSO protection enabled for non-custom domains. Do not disable it or change protection as a shortcut.
- A read-only Vercel environment-variable inventory for project `synergy` showed only `SUPABASE_AUTH_URL` and `SUPABASE_AUTH_ANON_KEY`; no `DATABASE_URL` and no Cloudinary keys were present in the inventory. The exact TASK-007 Neon branch is `br-steep-field-b3nti5ov` in project `ancient-band-38052550`. Do not read, print, or request decrypted secret values.
- The isolated Neon TASK-007 database branch was already migrated and live-tested. Keep all schema work on the isolated branch only.

## 3. Mandatory source audit

Before editing, read:
- `AGENTS.md`, `SECURITY_RULES.md`, `SYSTEM_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `QUALITY_GATES.md`, `ROADMAP.md`;
- `task/TASK-007-member-identity-profiles.md`, `handoff/TASK-007.md`, `handoff/CURRENT_STATUS.md`;
- all profile schema, Drizzle migrations, service, route handlers, profile pages/components, auth/session, rate-limit, CSRF/origin, navigation and avatar UI code;
- Vercel deployment integration/configuration notes in repo, if any.

Inspect the two original design boards available in the project attachments/runtime if accessible. Preserve the established dark navy surfaces, mint/teal accents, compact member profile layout, accessible controls, and responsive behavior. Do not redesign unrelated areas.

## 4. Profile navigation and routes

- Inspect actual route behavior before editing. Confirm authenticated member route resolution and onboarding state.
- For signed-in users, both mobile Profile tab and desktop sidebar Profile item must lead to the authenticated member's own profile, not `/u/amara.makes`.
- Prefer a stable `/profile` route that resolves the current verified session and redirects to onboarding if no profile exists; if the existing route already does this, use it.
- Signed-out visitors must not be shown a misleading own-profile link. Preserve sign-in/create-account destinations as appropriate.
- Keep Account accessible, with clear links to view/edit profile and sign out.
- Make active navigation state work on `/profile`, `/profile/edit`, and onboarding as appropriate.
- Remove or rewrite stale sidebar copy claiming no profile is stored. Label demo profiles as demo wherever they remain discoverable.
- Do not leak identity IDs or private profile fields into client navigation props.

## 5. Phone photo upload

### Provider and configuration
- Use the existing Cloudinary free-tier account only if the project's environment is actually configured for it. Do not create a paid service or assume that a ChatGPT Cloudinary connector connection configures the website's runtime.
- Expected server-only environment variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. The secret must never be exposed to browser JavaScript, public env vars, logs, client responses, or Git.
- If the values are absent, still implement the safe, production-shaped integration and a clear disabled/configuration-needed UI state; do not fake successful uploads. Record the exact variable names and that the owner must add them securely to Vercel Preview and the local agent runtime. Do not ask the owner to paste secrets into chat.
- Do not silently fall back to a third-party public image host or data URLs.

### Upload UX
- Use a native `input type=file` with `accept="image/jpeg,image/png,image/webp"` and mobile-friendly capture/gallery behavior (do not force camera capture).
- Support selecting an image from phone gallery/file picker, preview before save, replace/cancel, loading state, accessible error/success messages, and retry.
- Enforce a maximum of 4 MB and reasonable image dimensions; accept JPEG, PNG and WebP only; reject SVG, GIF, HTML, and arbitrary files. Validate both client-side for usability and server-side for security.
- Render the uploaded image on own and public profile views, respecting the existing visibility policy. Use safe image rendering and a tightly scoped remote-image allowlist/configuration. Provide initials fallback only when there is no valid avatar.
- Preserve existing display name, username, bio, visibility behavior and form validation.

### Upload security and persistence
- Use a server-authorized flow with verified session identity and CSRF same-origin checks. The browser must never receive `CLOUDINARY_API_SECRET`.
- Prefer server-side upload/signature generation with fixed resource type, constrained folder such as `synergy/avatars/<opaque-auth-subject-or-stable-profile-id>`, generated random public IDs, no caller-controlled folder/public ID, and strict type/size checks.
- If using direct-to-Cloudinary signed upload, the server must generate the signature over an allowlisted parameter set; do not let the browser choose arbitrary signed parameters. If a server proxy is more appropriate for this repo, respect Vercel request size limits.
- Do not trust client-supplied owner IDs, role, Cloudinary public ID or asset URL. Verify returned asset metadata/URL and bind it to the current authenticated profile.
- Persist the canonical HTTPS secure URL. Prefer persisting Cloudinary public ID as an internal field if needed for future replacement/deletion; never expose internal storage identifiers in public DTOs.
- Do not expose internal identity fields in profile API DTOs. Keep public/private access enforcement unchanged.
- Rate-limit upload/signature endpoints. Handle failed upload without overwriting a previously saved avatar. A photo must not be marked saved until the server confirms it.
- Avoid orphaning old images where feasible; document any deferred cleanup rather than deleting assets unsafely.
- Do not log image bytes, signatures, API secrets, tokens, or full private database rows.

## 6. Vercel Preview block and configuration

Investigate the exact block using the current Vercel project/team and Git metadata. Vercel's collaboration guidance says private-repository commits can be blocked when the commit author cannot be associated with the Vercel user/team; for Hobby teams, private-repo collaboration is unsupported and commits must be authored by the Hobby-team owner, with the Git provider connected. For Pro teams, the commit author must be a confirmed team member. Verify actual team plan, latest commit author identity/email, GitHub↔Vercel account connection and team membership before recommending a fix.

- Do not disable SSO, weaken Deployment Protection, change team membership, upgrade a paid plan, change billing, transfer project ownership, or rewrite commit authors to impersonate the owner.
- If the fix requires an owner action (connect GitHub login, verify email, approve access, team membership, or plan change), stop and report exact Vercel dashboard path/action. Never pretend the block is fixed.
- Ensure the intended project is `synergy` (ID above), not the duplicate `synergyop` project.
- Do not deploy to Production or promote/alias any deployment to production.
- After Preview is unblocked, trigger a Preview deployment from this branch's exact HEAD and verify deployment branch, commit SHA, project ID and READY state.
- Environment inventory currently lacks `DATABASE_URL` and Cloudinary variables. The app will not be a fully working real-profile experience on Vercel until the correct isolated Neon branch connection is securely added to Preview and Cloudinary values are securely added to Preview. Do not copy secrets from local files, print them, or place them in source. Do not add a production-target secret. If owner action is needed, document the exact Preview-only variables and dashboard path.
- Keep existing Supabase variables intact. Do not expose the Supabase anon key as a server secret if the app currently expects it as public config; audit the current naming/usage rather than changing it in this task.

## 7. Required tests and evidence

Add tests for:
- mobile and desktop signed-in navigation target is own `/profile`, not demo;
- signed-out navigation behavior;
- profile routes redirect correctly between onboarding and profile;
- avatar file input accepts intended formats and rejects unsupported/oversize files;
- unauthorized, missing-session, cross-user and CSRF upload requests are rejected;
- server-only signature generation and fixed upload folder/public-ID constraints;
- upload failure does not overwrite saved avatar;
- successful upload persists URL and public profile displays it;
- private profile still returns not-found to non-owner;
- no internal identity/storage IDs or secrets in public DTOs, HTML/RSC payloads, browser bundle or logs.

Run all repository quality gates applicable to the branch: format check, lint, typecheck, unit/integration tests, build, secret scan, boundaries, DB generate/migrate/live checks where appropriate. Run responsive/Playwright if browser dependencies are available; otherwise report NOT RUN with the exact environmental blocker, not PASS.

For database migration/live checks, confirm the Neon branch identity immediately before any write and prove it is `br-steep-field-b3nti5ov`; never write to Production.

## 8. Branch, docs and delivery

- Work only on `task/TASK-007B-profile-media-navigation-preview`, starting from the exact base commit above.
- Do not modify `main`, TASK-008 or unrelated projects.
- Keep commits small/coherent and branch isolated.
- Update this task file with final scope, implementation, migration and test evidence.
- Create/update `handoff/TASK-007B.md` and `handoff/CURRENT_STATUS.md` for the next agent, including changed paths, architecture, design tokens/patterns, exact branch/commit, DB branch, Preview deployment, owner actions still needed, known limitations and next recommended task.
- Push the branch and report exact HEAD SHA and GitHub branch link.
- Do not merge, open an auto-merge PR, or promote to Production. The owner will review Preview and accept the task separately.

## 9. Completion definition

The task is complete only when:
- authenticated users can navigate to their own real profile and edit it;
- a real phone-gallery photo can be uploaded and is rendered after refresh;
- security/privacy tests pass;
- required Preview environment variables are present securely (or explicitly identified as owner-blocked);
- the exact branch commit has a READY Preview deployment (or exact Vercel owner-action blocker is documented);
- task/handoff docs contain reproducible evidence;
- `main` and Production are unchanged.

Report honestly which parts are implemented, tested, deployed, or waiting on owner action. No fabricated test, deployment or upload success.
