# TASK-010B — Booking state and provider acceptance

Status: READY (in form) — start only after TASK-010A and G-1 approval.

Goal
Model booking/request state transitions clearly and enforce that a request is not confirmed until the provider accepts it and required conditions are met.

Non-goals
- Real payments/protected payment flows.
- Escrow claims.
- Any mutable-balance-as-source-of-truth model.

Acceptance criteria
- Booking/request states include pending/accepted/declined/expired/cancelled/in-progress/completed/disputed as applicable.
- A request is not confirmed until provider acceptance and required conditions are met (D-005).
- State transitions are validated server-side.
- Ownership/permission checks apply to booking/request mutation.

Affected areas
- marketplace, bookings/orders (state only, no money movement), trust-and-safety.

Risks
- State transition errors.
- Accidental confirmation semantics before payments are in scope.
- Confusing booking state with payment state.

Test plan
- State transition validation tests.
- Provider-acceptance-required tests (D-005).
- Ownership/permission tests for booking/request mutation.
- Negative tests for unauthorised access.

Dependencies
- TASK-010A enquiry and pre-hire messaging.
- `ADR-0003`.
- D-005 CONFIRMED (provider acceptance required for each booking).

Security / privacy impact
- Booking/request state is user/business data. Mutations must be authenticated, authorised, and validated server-side.

Cost impact
- None incurred. No money movement is implemented.

Note
Payments, ledger, refunds, payouts, and commissions remain DEFERRED. This task models booking state only.
