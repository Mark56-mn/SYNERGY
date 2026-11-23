# TASK-008F — Preview deployment and posting verification

Status: **APPROVED — PREVIEW ONLY**
Branch: `task/TASK-008F-preview-deployment-and-posting-verification`
Base: `task/TASK-008C-discover-and-explore`
Owner authorization: explicit approval in chat on 2026-11-23 to deploy the newer social code to Vercel Preview, resolve the Preview deployment blocker, and test posting.

## 1. Goal

Make the existing TASK-008A/B/C social publishing implementation available on a READY Vercel Preview and verify the caption-only post flow. Preserve Production, main, and the unaccepted TASK-008D work.

## 2. Important verified starting facts

- Vercel team: `drop` / `team_ySUNql5RT7Dz4lIOVeSeI0r9` (Hobby plan).
- Vercel project: `synergy` / `prj_y1Kfch3yxkcV6deQBAAC6xhtRbO7`, linked to `Mark56-mn/SYNERGY`.
- The latest TASK-008C deployment was **BLOCKED**:
  - deployment `dpl_FLUJYRdohmb26hDiumdEVs4A8WuH`
  - commit `586ab9998d43bbd71ddd5f0c6f32120fbe625977`
  - author `Codebuff (SYNERGY agent)` / `codebuff-team`
  - Vercel message: commit author does not have permission to create deployments for this project.
- TASK-008A/B/C are remotely available and contain the real social publishing implementation. TASK-008C includes TASK-008B and TASK-008A in its ancestry.
- TASK-008D's reported branch `task/TASK-008D-creator-follow-graph-and-following-feed` and commit `add337415ff09c32e708ed1250d5bdfab1fa6bd1` are NOT present in remote GitHub: branch search found no 008D branch and fetching the SHA returned no commit. Do not fabricate or deploy it.
- This task branch is based on TASK-008C, so it deploys the latest remotely available publishing stack. The 008D follow-graph slice remains excluded until its owner-unaccepted work is safely committed/pushed in a later authorized step.
- Preview env metadata shows entries for `DATABASE_URL`, `SUPABASE_AUTH_URL`, `SUPABASE_AUTH_ANON_KEY`, and `MEDIA_PROVIDER_ADAPTER`; do not decrypt or print values. `MEDIA_PROVIDER_ADAPTER` was set to `stub` in Preview to fix login. Preview entries for Cloudinary variables exist but their actual values are not verified.
- Production target and Production variables must not be changed.

## 3. Deployment method / author-permission blocker

The prior block is tied to the latest Git commit author `codebuff-team`. Do NOT add that identity to the Vercel team or change team membership.

This task branch is created from TASK-008C and its task/handoff commits are authored through the owner's authenticated GitHub connection (`mark56-mn`). Vercel Git integration should therefore see an authorized latest commit while retaining the exact TASK-008C application source. Verify the resulting deployment metadata; do not assume the workaround succeeded until Vercel says READY.

If Git integration still blocks the commit, stop and report the exact error. Do not rewrite historical authors, add team members, change SSO, or weaken access controls. A direct Vercel deployment from the linked Git source may be considered only if it preserves Preview target and exact SHA, and must be separately evidenced.

## 4. Scope and acceptance

1. Confirm the task branch's application tree is identical to TASK-008C except for task/handoff documentation. No app source, config, dependency, schema or migration changes.
2. Confirm Vercel deployment target is **Preview**, project is `synergy`, and deployed full SHA is the new task-branch head.
3. Wait for **READY** and capture deployment ID, URL, branch, full SHA and build result. If BLOCKED/ERROR, inspect build events and stop without modifying team membership or settings.
4. Verify the Preview-only variable names are present without decrypting values. Confirm `DATABASE_URL`, Supabase Auth URL/key, and `MEDIA_PROVIDER_ADAPTER` exist for Preview. Never print values.
5. Verify route/UI availability using the protected Vercel access mechanism where possible:
   - `/`
   - `/compose`
   - `/api/v1/health`
   - `/api/v1/feed`
   - `/api/v1/posts` (method matters; do not issue a mutating POST without an authenticated owner test)
6. Confirm `/compose` is present and the Create/Post action reaches the composer. Confirm text-only publish path is not coupled to Cloudinary.
7. Owner Android test, with their existing account:
   - sign in;
   - tap central Create/Post;
   - enter a short caption only (no photo);
   - publish once;
   - confirm success and that the post appears in feed and own profile after refresh.
8. Photo upload is a separate optional check. It requires working Preview Cloudinary credentials and an appropriate adapter; if unavailable, report photo upload blocked without treating text-only publishing as failed.
9. Do not create test accounts or request credentials. Do not make a post through tools; the owner performs the single real-user posting check and can remove their own test post if desired.

## 5. Hard restrictions

- Preview only. Never deploy, promote, alias or change Production.
- Do not modify `main`, merge any branch, merge or accept TASK-008D, or touch other repositories.
- Do not modify app source, database schema/data, secrets, project settings, SSO, team membership, or Vercel environment variables.
- No GitHub Actions or new CI.
- Do not add paid services or incur optional costs.
- Do not decrypt or print secrets, cookies, tokens, connection strings, or personal data.
- If required Preview configuration is missing, stop and report exact variable names; request separate approval before editing variables.
- If the deployment is not READY or does not match the expected SHA, do not ask the owner to test it.

## 6. Required handoff

Update `handoff/TASK-008F.md` and `handoff/CURRENT_STATUS.md` with:
- exact task branch and full commit SHA;
- Vercel project/team and deployment ID/URL/target/state/full source SHA;
- author-blocker resolution evidence;
- Preview variable names and presence only;
- route status evidence;
- owner Android test result (PENDING until the owner reports it);
- distinction between caption-only publishing and optional photo upload;
- limitations, next action and permission boundary.

Status can be **DONE** only when Vercel Preview is READY at the expected SHA and owner confirms a caption-only post was successfully published and persisted after refresh. Until then use **DEPLOYED — OWNER TEST PENDING** or **BLOCKED**.
