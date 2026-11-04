# SYNERGY Quality Gates

A task is DONE only when applicable gates pass and evidence is recorded. If the repository does not yet have a command, document that gap; do not invent a passing result.

## Every task
- Requirements mapped to acceptance criteria.
- Scope/diff reviewed; no unrelated changes.
- No secrets or sensitive user data committed.
- Formatting/lint and typecheck pass where configured.
- Relevant unit/integration tests pass.
- Build passes for affected packages.
- Error, loading, empty, success and disabled states covered where applicable.
- Accessibility and responsive behaviour reviewed for UI work.
- Security/privacy implications reviewed.
- Documentation and handoff updated.

## Feature-specific tests
- Auth: valid/invalid credentials, session lifecycle, rate limits, recovery and server-side authorization.
- Social/privacy: owner vs non-owner, private/public visibility, blocked users, reporting and content removal.
- Marketplace: provider acceptance, booking state transitions, 10-message pre-hire cap including voice notes, listing media limits.
- Media: file type/size validation, ownership, processing failures, access controls and cost limits.
- APIs: validation, authorization, rate limiting, idempotency where retries occur.
- Database: migration apply, constraints, cross-user isolation, rollback/forward recovery.
- Payments (future): signed webhooks, duplicate events, reconciliation, refunds, disputes and ledger invariants.

## Evidence format
Record exact command, exit status, concise output summary and commit SHA. Attach screenshots or recordings for major UI work where the execution environment supports them. Do not claim manual review that was not performed.

## Release readiness
No public release until critical user journeys, privacy, reporting/blocking, moderation, backup/restore, incident response, support and cost monitoring have been validated. Payment release has additional financial/provider/legal gates.
