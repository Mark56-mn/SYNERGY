# TASK-008E — Preview posting parity diagnosis

Status: **READY — READ-ONLY INVESTIGATION**
Branch: `task/TASK-008E-preview-posting-parity-diagnosis`
Base: `task/TASK-008C-discover-and-explore`
Priority: P0 — owner-visible Preview blocker

## 1. Goal

Determine exactly why the owner can sign in, view the feed and like videos on the current SYNERGY Vercel Preview, but cannot publish a post. Establish whether the Preview is running code that contains the real TASK-008A/B posting implementation, whether the required Preview configuration is present, and whether a runtime/API failure remains.

Deliver a concise, evidence-backed diagnosis and a separate proposed next task. Do not repair anything in this task.

## 2. Known owner-observed facts

- Owner reports successful sign-in on the latest Preview after the Preview-only `MEDIA_PROVIDER_ADAPTER` setting was changed to `stub`.
- Owner can see the feed and like videos.
- Owner cannot post.
- The Preview deployment most recently created during the authentication fix:
  - deployment ID: `dpl_Hnd19rVebXZa6qPWa3kmgG4p83UR`
  - URL: `https://synergy-hcq6cr0p6-drop2.vercel.app`
  - source commit reported by Vercel: `a3d20574243bcd2e9945ad25079c0c95865df4a4`
  - source branch: `task/TASK-007E-normalize-preview-env-before-validation`
  - it was still BUILDING at the last recorded poll; re-check current state.
- The `synergy-d73hvvugk-drop2.vercel.app` alias was previously associated with the same TASK-007E commit.
- TASK-008A adds real feed/post persistence and create-post API; TASK-008B adds the `/compose` post creation studio and media-upload route. These branches are not known to have been deployed to this Preview.
- TASK-008B is **IMPLEMENTED — OWNER ACCEPTANCE PENDING**, not owner-accepted. Its spec and handoff are `task/TASK-008B-post-creation-studio.md` and `handoff/TASK-008B.md`.
- TASK-008C is stacked on TASK-008B and is the current task-line base for this diagnostic branch.
- Vercel Preview environment variable `MEDIA_PROVIDER_ADAPTER` was changed to `stub` with owner permission to resolve the login error. Do not change it again in this task.
- Production must remain untouched.

These are starting facts, not substitutes for fresh verification. Clearly distinguish observed evidence, owner-reported behaviour and assumptions.

## 3. Required investigation

1. Read `AGENTS.md`, `handoff/CURRENT_STATUS.md`, TASK-008A/B/C specs and handoffs, plus the relevant source-of-truth docs.
2. Inspect repository refs and commit ancestry. Record exact SHAs for TASK-007E Preview source, TASK-008A, TASK-008B and TASK-008C. Do not assume the task branch names or abbreviated SHAs identify the deployed build.
3. Inspect Vercel deployment metadata for the exact current Preview URL/deployment ID. Record current state, project, target, source branch, full commit SHA and build result. If another Preview URL is now active, identify it from Vercel's deployment list and prove which deployment the owner is likely using. Do not rely on an unauthenticated HTTP 302 as build evidence.
4. Compare the deployed commit's relevant files with TASK-008A/B:
   - homepage/feed implementation and post API routes;
   - `/compose` page and `PostStudio`;
   - `ComposeButton` navigation;
   - create-post route/service/repository;
   - required environment-variable validation and media-upload configuration.
5. Inspect Vercel runtime errors/logs for the current Preview around an owner posting attempt, if timestamps/logs are available. Do not print secret values, cookies, access tokens, request bodies containing personal data, or full environment values. Report variable names and presence/absence only.
6. Establish the exact expected user flow on TASK-008B: where the Create action should navigate, text-only publishing path, and the conditions under which photo upload is unavailable. Separate text-post requirements from optional Cloudinary photo upload.
7. If the deployed code does contain the relevant endpoints, diagnose whether failure is caused by route/API response, auth/session, database connectivity/schema, environment validation, or client UI. Use read-only probes and existing safe test mechanisms only. Do not create or delete database records.
8. End with one of:
   - **CONFIRMED CODE PARITY GAP** — deployed commit predates TASK-008A/B and lacks the post flow;
   - **CONFIRMED RUNTIME/CONFIGURATION FAILURE** — deployed code contains the flow, with exact evidence;
   - **INCONCLUSIVE** — state precisely what evidence is unavailable and the smallest owner action needed.

## 4. Non-goals and hard restrictions

- No source-code changes, bug fixes, migrations, database writes, seed data or cleanup.
- No Git commits, pushes, branch merges, PR merges or rebases.
- No Vercel deployments, rollbacks, aliases, environment-variable changes or project-setting changes.
- No Supabase Auth configuration changes or user/account creation.
- No production inspection that exposes personal data; Production must not be changed.
- Do not ask the owner to share passwords, tokens, cookies, API keys or environment values.
- Do not claim TASK-008A/B is deployed merely because it exists in GitHub.
- Do not mark TASK-008B or TASK-008D owner-accepted.
- If a required diagnostic action would write data or change infrastructure, stop and document the blocker.

## 5. Acceptance criteria

- Exact Preview deployment state, source branch and full source SHA are evidenced.
- Exact TASK-008A/B source refs and their relationship to the deployed SHA are evidenced.
- The deployed UI/API capability is compared against the post-creation acceptance criteria.
- Any runtime/configuration evidence is tied to the current deployment and a relevant timestamp.
- The conclusion distinguishes text-only publishing from optional photo upload.
- A minimal proposed follow-up task is provided, but not executed.
- No code, database, environment, deployment or production state is changed.

## 6. Required output and handoff

Update `handoff/TASK-008E.md` and `handoff/CURRENT_STATUS.md` with:
- status and exact commit SHA of this documentation-only task;
- deployment ID, URL, state, project, branch and full source SHA;
- exact refs/SHAs compared;
- relevant route/UI findings and runtime evidence;
- redacted environment-variable presence only;
- diagnosis and confidence;
- remaining unknowns and owner action, if any;
- proposed next task, dependencies and explicit permission boundary.

Keep the handoff concise and independently reproducible. Do not record secret values or personal data.
