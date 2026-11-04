# TASK-010A — Enquiry and pre-hire messaging

Status: READY (in form) — start only after TASK-009 and G-1 approval and messaging foundations exist.

Goal
Let a user make an enquiry to a provider and support permission-aware pre-hire messaging with the confirmed message cap.

Non-goals
- Real payments/protected payment flows.
- Escrow claims.
- Any feature that treats a mutable balance as the source of truth.

Acceptance criteria
- The enquiry flow is permission-aware.
- Pre-hire messaging cap is enforced server-side: 10 messages per person, including voice notes (D-006).
- The cap is displayed clearly in the product where relevant.
- Ownership/permission checks apply to enquiry/messaging access.

Affected areas
- marketplace, messaging, trust-and-safety.

Risks
- Messaging abuse before acceptance.
- Cap enforcement bypassed client-side.
- Accidental payment/commitment semantics before payments are in scope.

Test plan
- Pre-hire messaging cap enforcement tests (10 messages per person, including voice notes).
- Ownership/permission tests for enquiry/messaging access.
- Negative tests for unauthorised access.

Dependencies
- TASK-009 provider/listings.
- Messaging foundations as needed.
- `ADR-0003`.
- D-006 CONFIRMED (10 messages per person including voice notes).

Security / privacy impact
- Messaging is personal and abuse-prone. Rate-limit and cap enforcement are server-side; private messages are not exposed to advertisers or public surfaces.

Cost impact
- None incurred.
