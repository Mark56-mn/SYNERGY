# TASK-009B — Listing discovery

Status: READY (in form) — start only after TASK-009A and G-1 approval.

Goal
Let users discover provider and listing content in a way that respects visibility/ownership and keeps marketplace discovery distinguishable from organic and sponsored surfaces.

Non-goals
- Real payments or booking confirmation.
- Ad ranking or sponsored placement implementation.
- Full marketplace analytics.

Acceptance criteria
- Discovery surfaces respect visibility and ownership.
- Marketplace listing discovery is distinguishable in the model from organic feed and from any later sponsored placements, even if sponsored is not yet implemented.

Affected areas
- marketplace, feed/discovery, profiles.

Risks
- Privacy leakage through discovery surfaces.
- Accidental ranking pipeline mixing before sponsored/marketplace ranking is implemented.

Test plan
- Visibility/ownership tests for discovery surfaces.
- Negative access tests continue to pass.

Dependencies
- TASK-009A provider profiles and listings.
- `ADR-0003`.

Security / privacy impact
- Discovery surfaces are a common place for private data leakage. Enforce visibility/ownership at read time.

Cost impact
- None incurred.
