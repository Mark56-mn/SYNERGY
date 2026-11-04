Blueprint phase-1 task files (TASK-002 deliverable)

Each is a complete task spec: goal, non-goals, acceptance criteria, affected areas, risks, test plan, dependencies, review notes.

Conventions
- Status READY = may be started autonomously when its dependencies are satisfied and the gating approval is granted.
- Status BLOCKED = cannot start; reason recorded.
- Every task keeps the CONFIRMED / RECOMMENDED / UNRESOLVED distinction from DECISION_REGISTER.md. No task may silently promote a RECOMMENDED default to a CONFIRMED rule.
- Identity/authorisation scope: Supabase Auth is the identity authority; Neon holds profiles/relations; authorisation is service-layer deny-by-default with ownership checks (ADR-0003). Payments are DEFERRED and excluded from MVP.
- MVP_SCOPE.md boundaries apply to every task below; nothing below adds real payments, payouts, live streaming, AI logo generation, full SOAP governance product, or subscription tiers.

Task numbering is roadmap-aligned (roadmap item 6 onward). A task file is READY only when it is fully specified AND its dependencies are met AND any gating approval it needs is granted.
