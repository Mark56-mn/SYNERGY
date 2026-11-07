# Handoff Protocol

Every completed or blocked task must create/update a task-specific handoff and refresh `CURRENT_STATUS.md`.

Use this template:

- Task ID / title / status
- Branch and commit SHA
- Objective and scope
- Implementation summary
- Files added/changed/deleted
- API/schema/migration changes
- Commands run and exact results
- Tests and quality-gate evidence
- Security/privacy review
- UI evidence and design tokens/patterns
- Known limitations and unresolved decisions
- Rollback/recovery notes where relevant
- Next READY task and dependencies

Never state that a task passed unless the command was actually executed and its result observed.

## Handoff index

- `handoff/TASK-001.md` — repository assessment.
- `handoff/TASK-002.md` — architecture and technology plan (documents).
- `handoff/TASK-003.md` — application foundation: monorepo, shared contracts, web shell, server security boundary, Android foundation, gate evidence, audit findings.
- `handoff/TASK-006.md` — identity and profile persistence: planning handoff, then the TASK-006A implementation record (PARTIAL — server-side Supabase token verification; live binding blocked on B-7, the missing `SUPABASE_AUTH_URL` / `SUPABASE_AUTH_ANON_KEY`). TASK-006B not started.
- `handoff/TASK-005.md` — quality, accessibility and security gate extension: axe-core suite, responsive browser gate, boundary hardening tests, dependency triage, aggregate verification.
- `handoff/TASK-004.md` — responsive user experience: shell, feed, discovery, profiles, communities, video presentation, design-system extensions, demo-only boundaries, rendered visual review at four viewports.

Planning records (`task/**`, `handoff/**`, `docs/**`) and the owner-authored source-of-truth documents are excluded from Prettier and must not be auto-reformatted.
