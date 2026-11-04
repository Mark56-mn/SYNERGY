# TASK-007A — Content publishing and ownership

Status: READY (in form) — start only after TASK-006 and after G-1 approval and the media seam exists.

Goal
Let a signed-in user publish basic text/image content with owner-scoped create/read/update/delete and visibility enforcement.

Non-goals
- Video pipeline until media costs and processing are controlled.
- Full discovery personalization, ads, or marketplace discovery.

Acceptance criteria
- Text/image-first publishing goes through a module service with ownership/role checks and parameterised writes.
- The owner can read/update/delete their own content.
- A non-owner cannot create/update/delete someone else’s content.
- Visibility is enforced at read time; a private item is never returned to a non-entitled caller, including via search, feeds, or caches.
- If image media is enabled, it uses the `MediaProvider` seam and respects the listing/content media limits where applicable.

Affected areas
- content, media seam, feed/discovery, moderation status placeholder.

Risks
- Private content leaking into feed/search/preview.
- Media metadata trusted from the client.
- Premature video/media cost exposure.

Test plan
- Owner vs non-owner content create/update/delete tests.
- Visibility-at-read tests.
- Malformed input tests.
- Media limit enforcement tests where image media is in scope.
- Negative tests from `ADR-0009` where relevant.

Dependencies
- TASK-006 identity and profile.
- `ADR-0003`, `ADR-0005`.
- Real media only with G-2 provisioning or test doubles.

Security / privacy impact
- Content is user-generated and may be private. Serve only what the caller is entitled to see; do not leak existence vs hidden state through response shape where practical.

Cost impact
- None incurred. Media usage is cost-controlled by the `MediaProvider` boundary and application limits.
