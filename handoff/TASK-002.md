TASK-002 — Architecture and technology implementation plan

Status: DONE — documents written. Ready for owner approval at G-1. No scaffold exists, no installs, no provisioning, no product code, and no tracked source-of-truth document beyond status/roadmap entries was modified.

Branch and commits
- Branch: `chore/autonomous-foundation-v1`
- Local HEAD: `d9ee56ff00e357951a680662c33537270e98a559`
- Working tree: clean after this task’s new files were written locally (untracked until committed)
- Original TASK-002 commit on this branch: `a0d414e` (“TASK-002: write architecture and technology plan (planning-only, RECOMMENDED)”)
- This turn added the remaining TASK-002 deliverables locally and corrected two stale artifacts (`docs/adr/README.md` and `docs/MISSION_01_REMOTE_VERIFICATION_AND_PUSH.md`) so they match the actual repository state.

What was completed in this turn
- Re-read and reconciled the source-of-truth set: `AGENTS.md`, `MASTER_BLUEPRINT.md`, `DECISION_REGISTER.md`, `MVP_SCOPE.md`, `SYSTEM_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY_RULES.md`, `QUALITY_GATES.md`, `ROADMAP.md`, `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md`, and `docs/REPOSITORY_ASSESSMENT.md`.
- Re-read the existing ADR deliverables written earlier in this mission:
  - ADR-0001 web application framework and rendering strategy
  - ADR-0002 Android delivery path and its cost
  - ADR-0003 authorisation model for Supabase Auth with Neon
  - ADR-0004 migration and data-access tooling
  - ADR-0005 media provider boundary
  - ADR-0006 system context/container/module diagram (existing reference doc)
- Reconciled a real inconsistency in the prior work: the prior `docs/adr/README.md` index did not match the actual tracked ADR/doc set on this branch. It was corrected to match the actual deliverables and the planned set.
- Reconciled and rewrote the stale `docs/MISSION_01_REMOTE_VERIFICATION_AND_PUSH.md` because it referred to old HEAD values that no longer matched this workspace’s branch tip.

Deliverables now present on this branch
- ADR register index: `docs/adr/README.md` (corrected to match the actual set)
- ADR-0001: `docs/adr/0001-web-application-framework-and-rendering-strategy.md`
- ADR-0002: `docs/adr/0002-android-delivery-path-and-its-cost.md`
- ADR-0003: `docs/adr/0003-authorisation-model-for-supabase-auth-with-neon.md`
- ADR-0004: `docs/adr/0004-migration-and-data-access-tooling.md`
- ADR-0005: `docs/adr/0005-media-provider-boundary.md`
- ADR-0006: `docs/adr/0006-repository-layout-and-import-boundaries.md`
- ADR-0007: `docs/adr/0007-environment-variable-schema-and-secret-handling.md`
- ADR-0008: `docs/adr/0008-quality-tooling-plan.md`
- ADR-0009: `docs/adr/0009-identity-and-profile-threat-model-and-data-classification.md`
- ADR-0010: `docs/adr/0010-cost-and-infrastructure-proposal.md`
- ADR-0011: `docs/adr/0011-soap-architecture-note.md`
- System context / diagram / flow / lifecycle reference: `docs/adr/0000-system-context-container-module-diagram-and-data-lifecycle.md`
- Phase 1 breakdown: `docs/adr/phase-1-task-breakdown.md`
- Phase 1 task files created as READY-in-form:
  - `task/TASK-006A-identity-and-auth-foundation.md`
  - `task/TASK-006B-profile-ownership-and-visibility.md`
  - `task/TASK-007A-content-publishing-ownership.md`
  - `task/TASK-007B-basic-feed-and-visibility.md`
  - `task/TASK-008-follow-graph-and-visibility.md`
  - `task/TASK-009A-provider-profiles-and-listings.md`
  - `task/TASK-009B-listing-discovery.md`
  - `task/TASK-010A-enquiry-and-prehire-messaging.md`
  - `task/TASK-010B-booking-state-and-provider-acceptance.md`
  - `task/TASK-011A-user-reporting-and-blocking.md`
  - `task/TASK-011B-moderation-queue-and-audit.md`
  - `task/TASK-012-communities-if-in-mvp.md`
  - `task/TASK-013A-end-to-end-critical-journeys.md`
  - `task/TASK-013B-launch-readiness-checklist.md`

What was NOT done, deliberately
- No scaffold, no `package.json`, no lockfile, no installs.
- No Neon / Supabase / Cloudinary projects, credentials, or paid plans.
- No deployment, no CI, no merge into main.
- No changes to CONFIRMED rows in `DECISION_REGISTER.md`, and no changes to `MASTER_BLUEPRINT.md`, `MVP_SCOPE.md`, `SYSTEM_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY_RULES.md`, or `QUALITY_GATES.md` beyond the necessary status/roadmap updates.
- No resolution of open product decisions. Where the blueprint leaves a question unresolved, this work left it UNRESOLVED/RECOMMENDED and said so.

Key decisions preserved
- D-01: full 27-section blueprint at `docs/SYNERGY_MASTER_PRODUCT_BLUEPRINT_v1.0.md` is normative; `MASTER_BLUEPRINT.md` is the summary/navigation doc; `DECISION_REGISTER.md` remains authoritative for individual decision status. Owner-approved in this mission.
- ADR-0001..ADR-0005 are RECOMMENDED proposals consistent with the approved documents.
- ADR-0006..ADR-0011 and the diagram reference doc are RECOMMENDED planning outputs, not CONFIRMED product rules.
- Supabase Auth is the identity authority; Neon holds profiles/relations; authorisation is service-layer deny-by-default with ownership/role checks and per-protected-resource negative tests; RLS on Neon only supplementary and only where the Neon-JWT path is verified end-to-end.
- Media is behind the `MediaProvider` interface with a Cloudinary adapter plus a local stub adapter; listing media capped 3 pictures/2 videos; video ≤ 3/10/30 min; real media needs the owner to create a free-tier development project.
- SOAP fundamental-change rule is stated exactly as confirmed: ≥50% of the eligible active voting population YES, 90-day voting period; eligibility/quorum/independent-verification mechanics are NOT approved here.

Verification performed this turn
- One authoritative local verification: branch, HEAD, recent commits, tracked files, staged/unstaged/untracked state.
- Conservative secret scan over tracked text files: hits were only descriptive hex strings and ordinary prose such as “connection string”; no real credential-shaped value was found in any tracked file.
- One single remote reachability observation from this shell: `fatal: could not read Username for 'https://github.com': No such device or address`. The remote state was therefore NOT verified from this shell; the local state is reported authoritatively and the remote state is reported as unverified.

Stop condition
- TASK-002 stops at G-1 for owner approval before any scaffold.
- TASK-003 (scaffold) and the phase-1 task files created herein must not be started until the owner approves the architecture/technology plan.
- If the authenticated push path later becomes available, the Mission 01 final follow-through in `docs/MISSION_01_REMOTE_VERIFICATION_AND_PUSH.md` applies: fetch and compare remote tip to local HEAD `d9ee56ff00e357951a680662c33537270e98a559`, push only if they differ, re-confirm clean tree, re-run secret scan, write the final report, then stop at G-1.

Next actions after owner approval
- Approve the architecture/technology plan output (G-1).
- Then scaffold the repository per TASK-003 using the layout in ADR-0006 and the env/secrets and quality tooling plans in ADR-0007 and ADR-0008.
- Then begin phase-1 implementation tasks whose dependencies are met, starting with the identity/auth foundation task(s).

Handoff for this task
- This file.
- `handoff/CURRENT_STATUS.md` and `ROADMAP.md` updated to reflect TASK-002 as done and the approval gate before any scaffold.
