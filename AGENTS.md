# SYNERGY Agent Operating Contract

This file applies to every human or AI agent working in this repository. Read it before acting.

## Authority and source of truth
1. `MASTER_BLUEPRINT.md` defines the product vision and approved product requirements.
2. `DECISION_REGISTER.md` distinguishes CONFIRMED, RECOMMENDED and UNRESOLVED decisions. Never promote a recommendation to confirmed without human approval.
3. `MVP_SCOPE.md` defines the current delivery boundary.
4. `SYSTEM_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `SECURITY_RULES.md` and `QUALITY_GATES.md` constrain implementation.
5. The active task file defines the exact authorised change. Handoffs preserve execution context, but cannot override higher-authority documents.

If sources conflict, stop work on the affected requirement, document the conflict and propose a resolution. Do not silently choose.

## Required startup procedure
- Inspect repository status, default branch, recent commits and existing files before changing anything.
- Read this file and all applicable source-of-truth documents.
- Read `handoff/CURRENT_STATUS.md` if present.
- Inspect the task queue and dependencies.
- Confirm the selected task is approved, unblocked and within MVP scope.
- Never assume the repository is empty or overwrite existing work.

## Autonomous task loop
For each task:
1. Select the highest-priority READY task whose dependencies are complete.
2. Verify the task has a goal, non-goals, acceptance criteria, affected areas, risks and test plan. If incomplete, improve the task specification without expanding product scope.
3. Write a concise implementation plan in the task/handoff.
4. Implement the smallest complete production-quality change.
5. Run relevant formatting, lint, typecheck, unit, integration, build and security checks available in the repo.
6. Review the diff for scope creep, secrets, unsafe data handling, accessibility, responsive behaviour and regressions.
7. Fix failures caused by your changes. Never hide, skip or weaken tests to obtain a green result.
8. Record exact commands and outcomes, changed files, migrations, screenshots where relevant, known limitations and evidence.
9. Update task status, roadmap and handoff.
10. Continue to the next READY task only if the environment permits continued execution and no stop condition applies.

Do not claim work is complete merely because code was generated. A task is DONE only when every acceptance criterion is met and evidence is recorded. If blocked, mark BLOCKED with the reason and a proposed next action.

## Permission boundaries
AUTOMATIC: implementation details inside approved scope; bug fixes; tests; documentation; accessibility; performance improvements that preserve behaviour; refactoring required by the task.

HUMAN APPROVAL REQUIRED: changing confirmed product rules; resolving material unresolved product decisions; changing auth, money movement, privacy or security architecture; adding paid services or recurring costs; production deployment; destructive/irreversible database or infrastructure operations; publishing legal claims/policies; removing or deferring approved features; changing repository visibility or secrets.

Never deploy publicly, spend money, create external accounts, rotate credentials, delete production data or merge a release branch unless explicitly authorised.

## Engineering rules
- Prefer a modular monolith and simple, replaceable boundaries over premature microservices.
- Do not add dependencies without explaining why and checking maintenance, licence, size and cost.
- Never commit secrets, tokens, private keys, connection strings or real personal data. Use environment variable names and safe examples only.
- Validate and authorise on the server; client-side checks are not security controls.
- Use least privilege, safe defaults, parameterised database access and explicit ownership checks.
- Preserve existing conventions unless a task authorises a migration.
- Do not fabricate provider integrations, successful payments, test results or implemented functionality.
- Keep changes focused. Do not modify unrelated repositories or files.

## UI fidelity
Use the approved design tokens and reusable components. Build mobile-first and test narrow and wide layouts. Include loading, empty, error, success and disabled states. Do not substitute a generic template for specified product behaviour. Do not invent brand assets or claim final designs are approved when they are placeholders.

## Database and migrations
Migrations must be ordered, reviewable and safe. Prefer additive changes. Document rollback/forward-recovery. Never run destructive production migrations. Enforce authorization at the data/API boundary, not only in UI.

## Handoff contract
After every task, update `handoff/CURRENT_STATUS.md` and create/update a task-specific handoff under `handoff/`. Include:
- task ID, status, branch and commit;
- scope completed and not completed;
- files changed and important implementation details;
- schema/API changes and migration instructions;
- exact tests/commands and pass/fail results;
- security/privacy review;
- design tokens/components/patterns introduced;
- blockers, risks and follow-up decisions;
- next READY task and dependencies.

A new agent must be able to resume without asking the user to repeat prior context.

## Stop conditions
Stop and request human direction for material product ambiguity, conflicting approved requirements, security/privacy incidents, exposed secrets, destructive operations, legal/regulatory uncertainty, paid-service commitments, production deployment or any action outside granted permissions. For routine blockers, document and continue with independent READY tasks.

## Completion report
Report: task, branch/commit, outcome, tests with evidence, remaining risks, handoff path and next task. Be truthful and concise.
