# TASK-007B — Basic feed and visibility

Status: READY (in form) — start only after TASK-007A and G-1 approval.

Goal
Provide a basic feed that respects visibility and follow settings without leaking private content.

Non-goals
- Full personalization, ads, sponsored placements, or marketplace discovery ranking beyond the MVP minimum.
- Anything that secretly blends organic and sponsored/marketplace ranking.

Acceptance criteria
- The feed is built from services that respect visibility and follow settings.
- Private content is not returned to non-entitled callers.
- Organic content and any later sponsored/marketplace surfaces remain distinguishable in the model, even if sponsored/marketplace are not yet implemented.

Affected areas
- feed/discovery, profiles/social graph, content visibility.

Risks
- Private content leaking into feed/search/preview.
- Accidental mixing of ranking pipelines before they are implemented.

Test plan
- Visibility-honouring feed tests.
- Follow setting honouring tests.
- Negative access tests continue to pass.

Dependencies
- TASK-007A content publishing.
- TASK-008 follow graph if follow-driven feed is in scope.

Security / privacy impact
- Feed construction is a common leak point for private content. Visibility must be enforced when the feed is built, not only in the UI.

Cost impact
- None incurred.
