# TASK-009A — Provider profiles and listings

Status: READY (in form) — start only after TASK-006 and G-1 approval.

Goal
Support individual and business provider profiles and service/product listings, with ownership and listing-media limits enforced.

Non-goals
- Real payments/booking confirmation until the provider acceptance model is in place.
- Paid guarantee badge (D-015 is not approved).
- Subscription tiers.
- Any commission logic beyond what is explicitly approved (D-016 is unresolved).

Acceptance criteria
- Provider profiles support individual and business provider types.
- Listings support the product’s listing fields.
- Listing media is capped at 3 pictures and 2 videos (D-007), enforced at the boundary, not only in the UI.
- Only the listing owner can update/delete their listing.
- Provider type/business-staff representation is handled cleanly for the MVP minimum.

Affected areas
- marketplace, profiles, media (listing media caps), trust-and-safety placeholders.

Risks
- Listing media limits bypassed via client metadata.
- Accidental paid-badge or commission logic introduced before approval.
- Provider representation inconsistencies.

Test plan
- Listing media limit enforcement tests (3 pictures / 2 videos).
- Listing ownership tests.
- Provider-type representation tests.
- Negative tests for unauthorised listing mutation.

Dependencies
- TASK-006 identity/profile.
- `ADR-0005` media seam.
- D-007 (listing media cap) CONFIRMED; D-015/D-016 UNRESOLVED.

Security / privacy impact
- Provider business data and listing media are user/business data. Ownership and media caps must be enforced server-side.

Cost impact
- None incurred. Listing media uses the `MediaProvider` boundary and application caps.
