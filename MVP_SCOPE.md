# SYNERGY MVP Scope

Status: proposed delivery boundary derived from the product blueprint. It is not permission to skip acceptance review.

## MVP outcome
A user can create an account, establish a profile, publish and discover basic content, follow people, find providers and listings, make an enquiry, and use essential safety controls. Build a coherent usable product, not disconnected mock screens.

## Phase 0 — foundation (first)
- Repository conventions, app/package architecture proposal, development environment and documentation.
- Design tokens, component foundations, responsive shell and navigation.
- CI-independent local quality scripts and test strategy. Do not add GitHub Actions unless explicitly approved.
- Environment variable schema and safe example files; no real secrets.
- Threat model, data classification and architecture decisions.

## Phase 1 — core MVP
- Email-based account registration/sign-in integration design and user profile.
- Basic social feed and content publishing (text/image first; video pipeline only when media costs and processing are controlled).
- Following and profile visibility/privacy foundations.
- Communities only to the extent a complete safe minimum can be delivered; otherwise schedule as a distinct next milestone.
- Provider/business profiles and service/product discovery.
- Listing detail, enquiry and provider response workflow. No real payments.
- Reporting, blocking, moderation queue foundations and safe content handling.
- Responsive web experience; Android delivery plan/foundation should not destabilise the web MVP.

## Explicitly deferred from first MVP
- Real payments, wallet, escrow, payouts and commissions.
- Creator revenue calculations/payouts.
- Paid advertising marketplace and advertiser billing.
- Live streaming and audio/video calling.
- AI logo generation.
- Full SOAP voting/governance product and external protocol certification.
- Complex subscription tiers.
- MongoDB analytics deployment and premature microservices.

## MVP acceptance
- Primary user journeys work end-to-end against a real development environment or clearly labelled test doubles.
- No fake payment success or fabricated integration.
- Authentication and access control enforced server-side.
- Reporting/blocking flows work, not just display.
- Mobile-first layouts include loading, empty, error and success states.
- Critical user flows have automated tests.
- Setup, environment variables, migrations and operational limitations are documented.
- Cost/security risks and known gaps are explicit.

## Scope change
Any feature addition that materially expands MVP, changes a confirmed rule, creates ongoing cost or delays launch requires a written proposal and human approval.
