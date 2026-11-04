Phase 1 task breakdown (roadmap items 6–13)

Status: RECOMMENDED planning output for TASK-002. These task specs are written so the relevant tasks can be created as `task/` files and marked READY after G-1 approval and after the scaffold/TASK-003 and quality gates/TASK-005 are in place where they are dependencies. Nothing here is an implementation claim.

How to read this
- Each item below becomes one or more `task/` files.
- A task is READY only when it is fully specified AND its dependencies are met AND any gating approval it needs is granted.
- Every task keeps the CONFIRMED / RECOMMENDED / UNRESOLVED distinction from `DECISION_REGISTER.md`. No task may silently promote a RECOMMENDED default to a CONFIRMED rule.
- Identity/authorisation scope for every task: Supabase Auth is the identity authority; Neon holds profiles/relations; authorisation is service-layer deny-by-default with ownership checks (`ADR-0003`). Payments are DEFERRED and excluded from MVP.
- MVP_SCOPE.md boundaries apply to every task below: no real payments/payouts/live streaming/AI logo generation/full SOAP governance product/subscription tiers.

Roadmap item 6 — Identity and profile foundation

Goal
A user can create an account, sign in, and establish a profile, with server-side session verification and deny-by-default profile ownership/visibility.

Non-goals
- Real payments, payouts, subscriptions.
- Full creator/provider economics.
- Community, feed, or marketplace features beyond what is needed to verify profile ownership/visibility.

Acceptance criteria
- Email-based sign-up/sign-in/recovery via Supabase Auth with server-side session verification.
- Profile is created/looked up keyed by `supabase_user_id`; no password column in the app database.
- A user can read/update their own profile; cannot read another user’s private profile fields; cannot update another user’s profile; unauthenticated access to protected endpoints is denied.
- Profile privacy/visibility fields are enforced at read time.

Affected areas
- identity, profiles, auth session, db schema/migrations, env/secrets for Supabase Auth + Neon, threat model from `ADR-0009`.

Risks
- Accidental leakage of private profile data through API shape, search, previews, feeds, or caches.
- Treating client-supplied identity/roles as truth.
- Weak session lifecycle handling.

Test plan
- Implement the negative tests named in `ADR-0009` for profiles and owned content.
- Valid/invalid credentials and recovery flow tests where Supabase Auth supports them.
- Session lifecycle tests where supported.
- Cross-user access denial tests.
- Secret scan and env validation before any real credentials exist.

Dependencies
- TASK-003 scaffold and TASK-005 quality gates exist and are configured.
- Owner provisioning of free-tier Supabase Auth + Neon development projects (G-2), or clearly labelled test doubles until then.
- Approval of `ADR-0001`/`ADR-0003`/`ADR-0006`/`ADR-0007`.

READY sub-tasks implied
- task/TASK-006A-identity-and-auth-foundation.md
- task/TASK-006B-profile-ownership-and-visibility.md

Roadmap item 7 — Social feed and basic publishing

Goal
A signed-in user can publish basic text/image content and view a basic feed that respects visibility and ownership.

Non-goals
- Video pipeline until media costs and processing are controlled.
- Full discovery personalization, ads, or marketplace discovery.

Acceptance criteria
- Text/image-first publishing through a module service with ownership/role checks and parameterised writes.
- Owned content can be read/updated/deleted by the owner; not by others.
- Visibility is enforced at read time; private items are never returned to non-entitled callers.
- Feed is built from services that respect visibility/follow settings.

Affected areas
- content, feed/discovery, profiles/social graph, media seam (image as allowed MVP media), moderation status placeholder.

Risks
- Private content leaking into feed/search/preview.
- Over-strong personalization assumptions before product validation.
- Premature video/media cost exposure.

Test plan
- Owner vs non-owner content tests.
- Visibility-at-read tests.
- Malformed input tests.
- Negative tests from `ADR-0009` where relevant.

Dependencies
- TASK-006 identity/profile foundation.
- `ADR-0005` media seam available; real media only with G-2 provisioning or test doubles.

READY sub-tasks implied
- task/TASK-007A-content-publishing-ownership.md
- task/TASK-007B-basic-feed-and-visibility.md

Roadmap item 8 — Follow graph and privacy enforcement

Goal
Users can follow/unfollow and control profile/follow visibility, with privacy enforced consistently.

Non-goals
- Full hybrid-friend model beyond MVP scope unless a complete safe minimum can be delivered.
- Any feature that paywalls safety/privacy/reporting.

Acceptance criteria
- Follow/unfollow is owner-scoped; you cannot mutate someone else’s connections.
- Follow/profile visibility settings are honoured in feeds/listings.
- Privacy defaults do not leak private content through search/preview/feed/API.

Affected areas
- profiles/social graph, feed/discovery, privacy model.

Risks
- Inconsistent privacy enforcement across surfaces.
- Accidental enumeration of private state.

Test plan
- Follow mutation ownership tests.
- Visibility-honouring tests for feeds/listings.
- Cross-surface privacy tests.

Dependencies
- TASK-006 profile ownership/visibility.

READY sub-tasks implied
- task/TASK-008-follow-graph-and-visibility.md

Roadmap item 9 — Provider/business profiles and listing discovery

Goal
Providers (individuals and businesses) can have profiles and listings; users can discover them.

Non-goals
- Real payments/booking confirmation until provider acceptance model is in place.
- Paid guarantee badge (D-015 is not approved).
- Full subscription tiers.

Acceptance criteria
- Provider profiles support individual and business provider types.
- Listings support the product’s listing fields; listing media is capped at 3 pictures and 2 videos.
- Listing ownership is enforced; only the listing owner can update/delete their listing.
- Discovery surfaces respect visibility/ownership.

Affected areas
- marketplace, profiles, media (listing media caps), trust-and-safety placeholders.

Risks
- Listing media limits bypassed via client metadata.
- Provider type/business-staff representation handled incorrectly.
- Paid-badge or commission logic accidentally introduced.

Test plan
- Listing media limit enforcement tests (3 pictures / 2 videos).
- Listing ownership tests.
- Provider-type representation tests.
- Negative tests for unauthorised listing mutation.

Dependencies
- TASK-006 identity/profile.
- `ADR-0005` media seam; listing media caps from D-007.

READY sub-tasks implied
- task/TASK-009A-provider-profiles-and-listings.md
- task/TASK-009B-listing-discovery.md

Roadmap item 10 — Enquiry workflow and provider response

Goal
A user can make an enquiry; a provider can respond; booking state transitions are clear and provider acceptance is required.

Non-goals
- Real payments/protectedPayment flows.
- Escrow claims.
- Any feature that treats a mutable balance as the source of truth.

Acceptance criteria
- Enquiry flow is permission-aware.
- Pre-hire messaging cap of 10 messages per person, including voice notes, is enforced server-side (D-006).
- Booking/request states include pending/accepted/declined/expired/cancelled/in-progress/completed/disputed as applicable.
- A request is not confirmed until provider acceptance and required conditions are met.

Affected areas
- marketplace, messaging, trust-and-safety, moderation placeholders.

Risks
- Enquiry/messaging abuse.
- State-transition errors.
- Accidental payment/commitment semantics before payments are in scope.

Test plan
- Pre-hire messaging cap enforcement tests (10 messages per person, including voice notes).
- Booking state transition tests.
- Provider-acceptance-required tests.
- Ownership/permission tests for enquiry/messaging.

Dependencies
- TASK-009 provider/listings.
- Messaging foundations as needed.
- `ADR-0003` authorisation model.

READY sub-tasks implied
- task/TASK-010A-enquiry-and-prehire-messaging.md
- task/TASK-010B-booking-state-and-provider-acceptance.md

Roadmap item 11 — Reporting, blocking and moderation foundations

Goal
Users can report and block; there is a moderation queue foundation with least-privilege staff tools and audit.

Non-goals
- Full moderation policy/legal review (that is a separate readiness item).
- Promises of anonymity or untraceability.
- Moderator access to private messages except user-reported or legally justified cases and recorded.

Acceptance criteria
- Block/report/mute/restrict controls exist and are enforced consistently across surfaces.
- Reporting starts a documented review workflow.
- Staff tools require least privilege, reason codes, audit logs, and separation of duties.
- Private content is not leaked through public surfaces.

Affected areas
- trust-and-safety, moderation, identity/profiles, content, messaging.

Risks
- Inconsistent enforcement across surfaces.
- Insufficient audit/review trail.
- Over-trust in client-supplied report context.

Test plan
- Block/report/mute/restrict enforcement tests.
- Ownership/visibility still enforced after reports/blocks.
- AuditLog presence tests for privileged/sensitive actions.
- Negative tests for unauthorised access continue to pass.

Dependencies
- TASK-006/TASK-007/TASK-008/TASK-009/TASK-010 as applicable.
- `ADR-0009` threat model.

READY sub-tasks implied
- task/TASK-011A-user-reporting-and-blocking.md
- task/TASK-011B-moderation-queue-and-audit.md

Roadmap item 12 — Communities minimum viable workflow, if validated in scope

Goal
If in scope for MVP, provide a safe minimum community workflow: public/private/hidden communities, roles, moderation basics, join approval, and feeds.

Non-goals
- Full community feature set if a complete safe minimum cannot be delivered in MVP; defer the rest.
- Anything that weakens reporting/blocking/privacy foundations.

Acceptance criteria
- Public/private/hidden communities exist with admin/moderator roles.
- Membership/join approval works as specified.
- Community feeds and rules are implemented only to the extent a complete safe minimum can be delivered.
- Reporting/blocking/privacy controls continue to apply.

Affected areas
- communities, feed/discovery, trust-and-safety, profiles.

Risks
- Scope overload; incomplete safe minimum.
- Privacy leakage through community discovery/feeds.

Test plan
- Membership/role/approval tests.
- Visibility and privacy tests across community surfaces.
- Negative tests for unauthorised actions.

Dependencies
- TASK-006/TASK-008/TASK-011.
- Explicit scope decision on whether communities are in MVP and how much.

READY sub-tasks implied
- task/TASK-012-communities-if-in-mvp.md

Roadmap item 13 — End-to-end testing and controlled launch readiness

Goal
End-to-end tests cover the critical journeys, and launch-readiness items are documented and tested before any public launch.

Non-goals
- Public launch without required readiness.
- Payments launch without financial/provider/legal readiness.

Acceptance criteria
- Critical user journeys have automated end-to-end tests.
- Privacy, reporting/blocking, moderation workflow, backup/restore, incident response, support ownership, and cost alerts are documented and validated where applicable.
- Known gaps and risks are explicit.

Affected areas
- all Phase 1 domains, operations, quality gates.

Risks
- False confidence from incomplete E2E coverage.
- Launching before safety/operations/cost monitoring are ready.

Test plan
- E2E tests for critical journeys.
- Negative/access-denial tests still pass end-to-end.
- Readiness checklist review with evidence.

Dependencies
- All prior Phase 1 tasks as applicable.
- `ADR-0008` quality tooling.
- Launch-readiness review (owner/staff).

READY sub-tasks implied
- task/TASK-013A-end-to-end-critical-journeys.md
- task/TASK-013B-launch-readiness-checklist.md

General note on payments and creator economics
Payments, ledger, refunds, payouts, commissions, subscriptions, creator earnings formula/payouts, and full SOAP governance product are out of MVP scope or unresolved. Any task that touches them must keep them DEFERRED and must not implement money movement, set commissions, or calculate payable earnings.

General note on SOAP architecture
SOAP principles — separation of organic/sponsored/marketplace ranking, transparency/explanations, versioning, public change history, auditability, and the confirmed constitutional Voting threshold — must be designed into the architecture, not bolted on. The confirmed rule is: a fundamental algorithm-structure change requires YES votes from at least 50% of the eligible active voting population with a 90-day voting period (`DECISION_REGISTER.md` D-010). Eligibility mechanics, quorum, and independent verification are proposed/recommended details and must not be silently treated as approved (`DECISION_REGISTER.md` D-020; `MASTER_BLUEPRINT.md` §10). The architecture must keep organic, sponsored, and marketplace ranking distinguishable by construction.
