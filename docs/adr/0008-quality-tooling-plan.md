ADR-0008 — Quality tooling plan for the foundation scaffold

Status: RECOMMENDED (pending owner approval)

Context
The repository currently has no formatter, linter, typecheck, test runner, accessibility check, secret scan, or dependency audit configured (`docs/REPOSITORY_ASSESSMENT.md`; `QUALITY_GATES.md`). This ADR defines the planned local quality toolchain so TASK-005 can implement it mechanically and so every later task records the same commands and evidence format. No CI is configured and none is approved yet (gate G-5); quality tooling runs locally per task and the exact command plus exit status plus result summary is recorded in the task handoff.

Constraints from approved documents
- `QUALITY_GATES.md`: every task runs formatting/lint/typecheck where configured, relevant tests, build for affected packages, accessibility and responsive review for UI work, security/privacy review, and documentation/handoff updates; evidence must record exact command, exit status, concise output summary, and commit SHA.
- `MASTER_BLUEPRINT.md` + `QUALITY_GATES.md`: no GitHub Actions unless explicitly approved.
- `AGENTS.md`: a task is DONE only when acceptance criteria are met and evidence is recorded; if a command does not exist yet, document the gap rather than invent a passing result.

Tooling plan (default set, all RECOMMENDED until scaffold/task approval)
1. Formatter
   - RECOMMENDED: a single code formatter for source files, configured once in the scaffold and used by everyone.
   - Purpose: remove style churn from reviews; make diffs about behaviour.
   - Evidence: formatter command with exit status.

2. Linter
   - RECOMMENDED: a linter for the web app language and config files.
   - Purpose: catch likely bugs, unused code, and rule violations before review.
   - Evidence: lint command with exit status.

3. Type checker
   - RECOMMENDED: strict type checking for the web app, aligned with `ADR-0001` (TypeScript strict).
   - Purpose: encode a large class of errors in the type system; keep server/client boundaries checkable.
   - Evidence: typecheck command with exit status.

4. Unit/integration test runner
   - RECOMMENDED: one test runner for the web app.
   - Purpose: run the negative tests and guarded-path tests required by `ADR-0003`, `SECURITY_RULES.md`, and `QUALITY_GATES.md`.
   - Evidence: test command with exit status and a concise summary of what ran.

5. Accessibility check
   - RECOMMENDED: automated accessibility checking where the app has UI, plus manual review for major UI tasks.
   - Purpose: support the accessibility expectations in `DESIGN_SYSTEM.md` and `QUALITY_GATES.md`.
   - Evidence: accessibility check command with exit status, plus manual review notes for UI tasks.

6. Secret scan
   - RECOMMENDED: a secret scan over the repository as part of commit/handoff verification, not as a one-time novelty.
   - Purpose: prevent credentials/keys/connection strings from being committed (`SECURITY_RULES.md`).
   - Evidence: secret scan command with exit status and “clean”/“found” result. Any hit is treated as a stop-and-report incident, not a “pass with notes”.

7. Dependency audit
   - RECOMMENDED: a dependency vulnerability audit run when dependencies change.
   - Purpose: surface known issues in dependencies before they reach review/deploy.
   - Evidence: audit command with exit status and concise summary.

Default command shape
The scaffold picks exact tool names/versions, but the commands TASK-005 will adopt follow this shape:
- format: run the formatter in check mode for verification; apply mode when formatting is wanted.
- lint: run the linter.
- typecheck: run the type checker.
- test: run the unit/integration suite.
- test-with-coverage where coverage is introduced (coverage is a scaffold decision, not assumed here).
- accessibility: run the accessibility checker against built/test routes where the scaffold provides them; otherwise document that the check is pending UI routes.
- secret-scan: scan the repository for likely secrets.
- dep-audit: audit dependencies for known vulnerabilities.

CI stance
- No CI platform without approval. Local scripts are the default quality path.
- If CI is later approved, the same commands above become the CI gates; nothing new is invented for CI that is not already local.

What “evidence” means here
For each quality command, the task handoff records:
- exact command,
- exit status,
- concise output summary,
- commit SHA at which it ran,
- and, for UI work, the responsive/accessibility review notes.

If a command has not been introduced yet, the handoff says so explicitly and does not claim a pass.

Scope of this ADR
- This ADR is about the quality toolchain plan, not about wiring it into CI.
- It does not select the exact formatter/linter/test runner/library versions — that is the scaffold task — but it fixes the categories and the evidence contract now so later tasks are consistent.
- It does not bypass G-5. If CI is wanted, the owner decides that separately.

Security and cost impact
- Security: secret scan and dependency audit are the direct security-relevant pieces; lint/typecheck/tests support the deny-by-default and negative-test posture in `ADR-0003` and `SECURITY_RULES.md`.
- Cost: local tooling is generally low-cost; the only cost risk is if a chosen tool becomes a paid dependency at scale, which is a scaffold/hosting concern addressed separately.

Open dependencies
- `ADR-0001` (web framework) — determines the primary language/tooling surface.
- `ADR-0004` (data tooling) — affects typecheck and test setup for data-access code.
- `ADR-0003` (authorisation model) — drives the required negative tests the test runner must support.
- `QUALITY_GATES.md` — determines the evidence contract.
