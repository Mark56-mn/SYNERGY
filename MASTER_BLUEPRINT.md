# SYNERGY — Master Product Blueprint
Version: 1.0 | Status: Working product source of truth

## Product vision
SYNERGY is a Nigeria-first social and commerce ecosystem connecting people, creators, communities, businesses, products and services. Content discovery should create useful paths to creators, communities, service providers, products and businesses—not operate as an isolated entertainment feed.

Initial controlled launch market: Ibadan, Nigeria. Brand direction: dark navy and mint green.

## Product principles
1. Useful discovery and genuine human connection over addictive engagement.
2. Users control privacy and personalisation.
3. Creators and small businesses should have fair opportunities.
4. Marketplace trust, transparent terms and safe transactions.
5. Safety, privacy, accessibility and security are foundational.
6. Ship in validated phases; do not build every long-term capability in the first release.
7. Clearly distinguish implemented functionality from prototypes and planned features.

## Product domains
- Identity and profiles: user accounts, profiles, privacy settings, following and mutual connections.
- Social: feed, posts, stories, reactions, comments, replies, mentions, reposts and quote-reposts.
- Video/media: short videos (up to 3 minutes), standard videos (up to 10 minutes), long videos (up to 30 minutes); quality options and adaptive delivery. Live streaming is deferred until moderation and operations are ready.
- Communities: public, private and hidden communities; roles, rules, moderation, join approval, feeds and events.
- Messaging: permission-aware direct messaging, message requests, group conversations and voice notes. Calls are planned, not assumed for MVP.
- Discovery: following/chronological feed, personalised discovery, creators, communities, businesses, services and products.
- Marketplace: individual and business provider profiles, service areas, service/product listings, enquiries, quotes, bookings and later protected payments.
- Creator economy: transparent revenue sharing; approved concept is 50% of net eligible advertising revenue to creators and 50% to SYNERGY. Exact calculation and payout terms remain unresolved.
- Advertising: clearly labelled sponsored placements, coarse geographic targeting and separate ad ranking. Political advertising requires verified sponsors, disclosure and public records.
- Governance: SYNERGY Open Algorithm Protocol (SOAP), transparent recommendation principles and governance safeguards.
- Trust and safety: reporting, blocking, moderation, appeals, anti-fraud, privacy and incident response.

## Recommendation and SOAP
SOAP means SYNERGY Open Algorithm Protocol. It is intended as an open protocol for transparent and auditable recommendation systems. Organic ranking, sponsored advertising and marketplace ranking must remain distinguishable. Ranking must not optimise solely for watch time, clicks or ad revenue. Candidate dimensions include relevance, quality/usefulness/originality, diversity, freshness and creator opportunity. Provide user controls such as chronological/following feed, not-interested feedback and explanations where feasible.

Fundamental algorithm structure changes require YES votes from at least 50% of the entire eligible active voting population—not merely 50% of votes cast—with a 90-day voting period. This is a confirmed constitutional requirement. Eligibility mechanics, quorum and independent verification remain proposed design details and must not be silently treated as approved.

## Marketplace trust rules
Providers may be individuals or companies. Service coverage can combine radius and selected areas; businesses may have multiple bases. Providers must accept each booking request. Pre-hire chat cap: 10 messages per person, including voice notes. Listing media target: up to 3 pictures and 2 videos. Itemised quotes and calculated totals are important. The proposed ₦5,000 guarantee-badge deposit is not approved for implementation; legal, financial and operational validation is required first.

## Financial safeguards
Use an append-only, auditable double-entry ledger for any future money movement. Use idempotency, signed webhook verification, reconciliation, refund/dispute handling, beneficiary verification and strict access controls. A database balance alone must not be treated as the source of truth for money movement. Do not claim legal escrow unless the regulated provider and applicable law support it. Payments are out of the initial foundation scope.

## Privacy, security and legal
No selling private messages, contacts or sensitive personal information. Advertisers should receive aggregate reporting, not viewer identities or precise location. Coarse targeting only (country/state/city/broad service area); do not target precise GPS, private address or neighbourhood. Provide privacy controls and user rights. Nigerian legal review is required for NDPA 2023/NDPC, consumer protection, payments, advertising, tax, IP and marketplace obligations. Do not make legal compliance claims without qualified review.

## Initial technical direction
Preferred architecture: modular monolith. Proposed infrastructure direction: Neon PostgreSQL as primary application database, Supabase Auth as identity provider, Cloudinary for initial media processing/storage/delivery. MongoDB is reserved for a future specialised analytics/recommendation workload, not core transactions. Do not add Firebase without a concrete approved need. Keep providers replaceable and costs observable. These are approved direction-level preferences, not permission to provision services or incur costs.

## Delivery strategy
Build a dependable foundation and a narrow MVP first. Controlled launch in Ibadan, then expand based on evidence. Web and Android are initial targets; iOS later. No public launch until authentication, privacy, reporting/blocking, moderation, backups, incident response, support and cost monitoring are tested. Payments require separate readiness review.

## Status vocabulary
- CONFIRMED: explicitly accepted product requirement.
- RECOMMENDED: proposed default; may guide planning but requires approval before it becomes an irreversible product rule.
- UNRESOLVED: must be decided or validated before implementation depends on it.
- DEFERRED: intentionally outside the current delivery phase.
