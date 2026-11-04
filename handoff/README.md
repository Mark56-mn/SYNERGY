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
