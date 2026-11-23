# TASK-008E — Preview posting parity diagnosis — handoff

- **Status:** READY — READ-ONLY INVESTIGATION NOT YET RUN
- **Branch:** `task/TASK-008E-preview-posting-parity-diagnosis`
- **Documentation commit:** `53732f3bd4ed920fa5770984a6c0264ba0328df2` (task specification)
- **Base:** `task/TASK-008C-discover-and-explore`
- **Code changes:** none
- **Database/environment/deployment changes:** none

## Objective

Find out why the owner can sign in, view the feed and like videos on the current Preview but cannot publish. First establish whether the Preview is running TASK-008A/B code; only then investigate runtime/configuration failures.

## Known Preview candidate

- Deployment: `dpl_Hnd19rVebXZa6qPWa3kmgG4p83UR`
- URL: `https://synergy-hcq6cr0p6-drop2.vercel.app`
- Last known source: TASK-007E branch, SHA `a3d20574243bcd2e9945ad25079c0c95865df4a4`
- Last known state: BUILDING (must be re-checked).

The owner has now confirmed successful login and feed visibility and reports likes work but posting does not. The Preview-only `MEDIA_PROVIDER_ADAPTER=stub` update fixed the login blocker. No other environment changes are authorized.

## Next agent instructions

Read `task/TASK-008E-preview-posting-parity-diagnosis.md` and follow it exactly. This is diagnosis only: no code edits, commits, pushes, database writes, deployments, environment edits, merges or Production changes.

## Required final evidence

Record the current Preview's full SHA and deployment state; compare it to TASK-008A/B/C SHAs and relevant routes/UI; inspect redacted runtime evidence; distinguish text post from optional photo upload; state a clear diagnosis or precise evidence gap; propose (but do not execute) the smallest next task.

## Design and implementation context

- Existing design: dark navy + mint green; use current shared design tokens/components if a later, separately authorized implementation is proposed.
- TASK-008B already specifies the mobile-first `/compose` studio, caption validation/counter, `#topic` preview, optional single photo, local text-only draft, honest publishing/failure states, and server-side authorisation.
- Text-only publishing is expected to work without Cloudinary. Photo attachment requires `MEDIA_PROVIDER_ADAPTER=cloudinary` plus `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; absent configuration should disable/fail photo upload honestly, not block text-only publishing.
- Do not redesign the UI or change product rules during diagnosis.
