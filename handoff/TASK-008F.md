# TASK-008F — Preview deployment and posting verification — handoff

- **Status:** APPROVED — DEPLOYMENT IN PROGRESS / OWNER TEST PENDING
- **Branch:** `task/TASK-008F-preview-deployment-and-posting-verification`
- **Base:** `task/TASK-008C-discover-and-explore`
- **Owner authorization:** explicit 2026-11-23 approval for Vercel Preview deployment, blocker resolution and posting test.
- **Scope:** deploy the already-implemented TASK-008A/B/C code only; no application source edits.

## Starting evidence

- Vercel team `drop` / `team_ySUNql5RT7Dz4lIOVeSeI0r9`; project `synergy` / `prj_y1Kfch3yxkcV6deQBAAC6xhtRbO7`.
- TASK-008C deployment `dpl_FLUJYRdohmb26hDiumdEVs4A8WuH`, SHA `586ab9998d43bbd71ddd5f0c6f32120fbe625977`, was **BLOCKED** because commit author `codebuff-team` lacked permission to create deployments.
- TASK-008D branch and reported commit `add337415ff09c32e708ed1250d5bdfab1fa6bd1` were not found in remote GitHub. This task therefore deploys TASK-008C, not 008D. Do not claim the follow graph is included.
- Preview env metadata contains names for `DATABASE_URL`, `SUPABASE_AUTH_URL`, `SUPABASE_AUTH_ANON_KEY`, `MEDIA_PROVIDER_ADAPTER`, and Cloudinary variables. Values have not been decrypted. Preview `MEDIA_PROVIDER_ADAPTER` was previously set to `stub`.

## Deployment approach

A new branch was created from TASK-008C. The task spec and handoff commits are made via the owner's authenticated GitHub connection as `mark56-mn`, so Vercel should see an authorized latest commit without adding the Codebuff identity to the Vercel team. Confirm the actual deployment author, branch, SHA, target and READY state before declaring the blocker resolved.

## Posting verification

Text-only publishing should work with authentication, profile and the Preview database. Cloudinary is only needed for attaching photos. Do not create a post via an unauthenticated API probe. Owner must use their existing Android account to publish one caption-only post and confirm it persists after refresh.

## Permission boundary

Preview only. No Production, main, merges, TASK-008D acceptance, environment edits, team membership changes, SSO changes, database writes, code fixes or other repos. If Preview config is missing or deployment remains blocked, stop and request separate approval before any change.
