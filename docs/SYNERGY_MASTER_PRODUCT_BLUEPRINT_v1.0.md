# SYNERGY Master Product Blueprint v1.0

> **Transcription notice.**
> This file is a structured transcription of the approved source document
> `SYNERGY_Master_Product_Blueprint_v1.0.pdf` (Version 1.0, 3 November 2026, "Nigeria-first planning baseline"), prepared during MISSION 00 so that agents working from the repository have the blueprint available.
> Labels **CONFIRMED / RECOMMENDED / UNRESOLVED / REJECTED** are preserved exactly as used in the source.
> The PDF remains the authoritative artefact. If this transcription and the PDF ever differ, the PDF wins and the difference must be reported — do not "fix" the blueprint to match code.
>
> **Relationship to `MASTER_BLUEPRINT.md`:** that file is the repository's 55-line summary and remains the document `AGENTS.md` points to as source of truth. This file is the fuller reference: it contains the same CONFIRMED decisions plus detail the summary omits (ad frequency and audio defaults, coarse-targeting definitions, creator-pool deductions, payout cadence, proposed voting eligibility and quorum, subscription tiers, Creator Partnership Marketplace, live-streaming deferral, editable-balance prohibition, no-CI rule). Precedence between the two is **UNRESOLVED** — see D-01 in `docs/REPOSITORY_ASSESSMENT.md` §8. Until the owner decides, report a difference rather than choosing one.

---

## 1. Executive summary

SYNERGY is a Nigeria-first social and commerce platform connecting people, creators, communities, businesses, products and services. It combines social networking, short- and long-form video, creator monetisation, advertising, business storefronts and a services/product marketplace. Content discovery should lead naturally to useful relationships, communities, services and commerce — not merely passive viewing.

The controlled initial launch is in **Ibadan, Nigeria**. Validate product usefulness, safety, operations and unit economics before expanding to Lagos, Abuja and other Nigerian cities, then other African markets and eventually international markets.

The full vision is larger than the first release: launch in deliberate phases.

SYNERGY includes **SOAP** — the SYNERGY Open Algorithm Protocol — an open standard for transparent recommendation principles, governance, change history and compatible implementations. SOAP must be designed into the original architecture, not bolted on later.

## 2. Status and decision authority

- **CONFIRMED** — explicitly selected or accepted by the user. Do not change without explicit approval.
- **RECOMMENDED** — a default selected to close a gap. Use as the working baseline, but obtain approval before irreversible or high-impact implementation.
- **UNRESOLVED / VALIDATE** — requires user choice, legal advice, provider validation, pricing evidence, security review or testing.

Legal and regulatory notes are planning requirements, not legal opinions or proof of compliance.

## 3. Vision, positioning and principles

**Vision:** a trusted digital ecosystem where people can discover, create, connect, learn, trade and earn.
**Positioning:** social discovery + communities + creator economy + services and product commerce.

**Principles:** user agency; transparent rules; creator opportunity; African context and representation; privacy by design; fair commerce; safety; portability; interoperability; cost discipline.

Do not optimise solely for watch time, clicks, ad revenue or addictive use. Essential privacy, security, safety, reporting, account recovery and complaint mechanisms must not be paywalled. Providers may be individuals or organisations. A provider profile must represent the actual provider type and authorised business staff.

## 4. Roles and identity

Roles: member, creator, provider/seller, advertiser, moderator/support agent, administrator/security operator. One account may hold multiple roles.

- **RECOMMENDED:** email is the initial registration and recovery anchor. Phone verification is optional initially and may be required for sensitive actions (withdrawals, high-value transactions, enhanced recovery). Phone verification alone is not proof of one human.

## 5. Launch scope and phases

**CONFIRMED:** initial controlled launch area is Ibadan, Nigeria.

**RECOMMENDED phases:**

1. **Foundation** — identity, profiles, permissions, database, media pipeline, reporting, audit logs, basic admin tools, privacy/terms, cost monitoring, test environment.
2. **Controlled MVP** — profiles, follows, feed, short video, comments, basic messaging/message requests, limited communities, creator pages, provider profiles, service listings, enquiry/booking requests, support/reporting.
3. **Transactions and creator economy** — regulated payment integration, order/booking lifecycle, refunds/disputes, creator earnings ledger, sponsorship tools, paid content/tipping where supported.
4. **Advertising and subscriptions** — native feed ads, campaign manager, optional advertiser wallet, premium tiers.
5. **SOAP governance/interoperability** — public specification, independent review, voting, signed releases, audits, portability, compatible operator pilots.

**RECOMMENDED platform order:** responsive web and Android first; iOS when resources and operational readiness permit. Do not launch every feature at once. Each phase needs measurable exit criteria, an owner and a rollback plan.

## 6. Social networking

**CONFIRMED**

- One-way following and mutual connections.
- Hybrid relationships: followers plus separate private mutual friendships.
- Granular privacy for posts, stories, followers, friends and profile fields.
- Messaging permissions: followers, friends, everyone or nobody; message requests for people outside the allowed group.
- Group conversations with admins, moderators, roles, join approval, invite links and configurable permissions.
- Text, voice notes, audio calls, video calls and group audio/video calls are planned.
- Comments, replies, likes, mentions, reposts, quote-reposts, comment controls, pinned comments, threaded discussions and creator-controlled repost permissions.
- Public, private and hidden communities with admins/moderators, feeds, events, rules, membership questions and community discovery.

**RECOMMENDED gap closure:** include block, mute, restrict and report. Blocking prevents direct contact and profile interaction within reasonable technical limits. Muting hides content without notifying the other person. Restricting quietly limits interaction. Reporting starts a documented review workflow. Privacy defaults must not leak private content through search, previews, recommendation cards or APIs. Give users audience selectors and controls for comments, mentions, tags, reposts and message requests. Do not promise that screenshots or copying can be prevented.

## 7. Content and video

**CONFIRMED**

- Shorts up to **3 minutes**; standard videos up to **10 minutes**; long-form up to **30 minutes**; live streams have a separate policy.
- Playback options: 480p, 720p, 1080p, 1440p and 4K; adaptive streaming and manual quality selection.
- Processing: adaptive quality, modern codecs, thumbnails, audio optimisation, device compatibility.
- **Cloudinary** is the initial media provider; keep the media layer replaceable and monitor usage/costs.

**RECOMMENDED:** conservative upload/file-size/monthly limits by account trust and plan. No unlimited free 4K uploads or unlimited retention. Store ownership, processing status, renditions, moderation status, licence/consent and retention metadata. Defer live streaming until live moderation, host controls, emergency shutdown, reporting, retention, bandwidth budget and response procedures exist. Creators retain ownership of original content; they grant SYNERGY only the licence necessary to host, transcode, cache, display, distribute and promote content as described in the service terms.

## 8. Discovery and recommendation

The feed combines followed accounts, communities, relevant discovery, local usefulness and marketplace discovery where appropriate. Clearly distinguish organic recommendations, followed content, sponsored placements and marketplace listings.

**RECOMMENDED ranking dimensions:** (1) declared interests and relationship relevance; (2) quality, usefulness and originality; (3) discovery diversity; (4) freshness; (5) creator opportunity and exposure distribution.

Watch time and engagement may be signals but must be adjusted for satisfaction, negative feedback, repeat exposure, spam, manipulation and user choice. Provide a chronological/following feed, personalisation controls, topic controls, "not interested", hide, mute, block, report, and plain-language reasons for recommendations. Keep organic, marketplace and paid-ad ranking pipelines separate. Ads must not secretly buy organic ranking. Measure satisfaction, meaningful interaction, creator reach distribution, diversity, successful commerce discovery, safety, retention, latency and cost — not watch time alone.

## 9. SOAP — SYNERGY Open Algorithm Protocol

SOAP is an open standard other platforms may adopt. It defines recommendation and governance constraints while allowing compatible operators to implement their own ranking models and infrastructure.

**SOAP scope:** ranking principles; creator fairness; diversity/discovery; transparency and explanations; separation of ads from organic ranking; versioning; public change history; auditability; governance; appeals; interoperability and conformance testing.

**RECOMMENDED versioning:** semantic versions. Patch releases fix defects without policy change; minor releases add compatible capabilities; major releases may alter protocol structure and require the constitutional process. Each release includes rationale, impact assessment, test results, change log and rollback instructions.

A **fundamental change** alters protected recommendation objectives, visibility/eligibility rights, ad/organic separation, governance, transparency obligations or protocol structure. Ordinary parameter tuning within published boundaries is not automatically fundamental.

Publish a registry of compatible operators, their deviations, data practices, configuration ranges and audit status. Compatibility does not mean SYNERGY controls those operators.

## 10. Governance and constitutional change control

**CONFIRMED**

- Fundamental algorithm-structure changes require YES votes from at least **50% of the eligible active voting population**. This is **not** 50% of votes cast.
- Voting population: eligible active users (Option B), under a published activity requirement.
- Voting period: **90 days**.

**RECOMMENDED eligibility gap closure:** account at least 90 days old; verified email; meaningful activity on at least 6 distinct days in the preceding 90 days; not suspended for serious abuse or proven vote manipulation at the eligibility snapshot; passed proportionate anti-Sybil checks. (Proposed rule, not user-confirmed.)

Freeze the voter list at the start of the vote. Publish eligibility rules, population count, exact proposal and protocol version. YES ballots must equal at least 50% of that frozen population. Abstentions and non-votes are not YES votes.

**RECOMMENDED additional quorum:** at least 60% participation, in addition to the confirmed 50%-of-population YES requirement. If quorum is not reached, the proposal fails. (Recommendation, not a confirmed user choice.)

**Voting integrity:** one eligible account/one secret ballot; privacy-preserving eligibility proofs where feasible; independent tally verification; signed public results; audit log; accessible voting; challenge window and recount process.

An independent **Algorithm Review Council** assesses feasibility, privacy, security, fairness and unintended effects, publishing findings and conflicts. It advises but cannot approve constitutional changes. A separate **Governance Appeals Panel** may order a recount, further review, pause or new vote. A multi-person **Security Council** may temporarily disable a vulnerable feature or revert a harmful release; it cannot permanently rewrite constitutional principles. Emergency actions require multiple approvals, logs, a time limit, public explanation when safe and post-incident review. No founder, investor, government, advertiser or single officer should have unilateral authority to permanently alter SOAP's protected rules.

**Reality check:** a company controlling its servers can technically deploy different code. Independent operators, open specifications, signed releases, external audits, portable data and migration options make unauthorised changes detectable and reduce dependence. Governance cannot override applicable law.

## 11. Services and product marketplace

Providers may be individuals or businesses. Storefronts include profile, capabilities, service areas, products/services, media, prices or quote-based pricing, guarantees and reviews.

**Provider profile:** provider type, display/business name, job title/capabilities, description, portfolio, contact preferences, operating hours, service locations and service radius. Businesses may have multiple operating bases. Service coverage combines radius and selected areas.

**Service listing:** title, category, description, area, availability, price model (fixed, starting-from, hourly or quote), duration, inclusions/exclusions, media, warranty, cancellation terms and booking requirements.

**Product listing:** title, category, description, price, stock, delivery/collection, variants, returns, warranty and media.

Support bundles, add-ons and itemised calculated quotes.

**CONFIRMED:** providers must accept each booking request before it becomes confirmed. Show pending, accepted, declined, expired, cancelled, in-progress, completed and disputed states.

**CONFIRMED:** pre-hire chat cap is **10 messages per person, including voice notes**. Clearly display the cap.

**RECOMMENDED:** allow normal messaging after an accepted booking/order, with spam/report/block protections.

**CONFIRMED:** each product/service listing supports up to **3 pictures and 2 videos**.

Providers upload their own business logo first; an AI logo generator may be considered later.

**Guarantee badge:** a ₦5,000 deposit for one badge was discussed but is **not confirmed**. **RECOMMENDED:** do not sell a badge as proof of quality. Start with written warranty terms, evidence requirements, exclusions and complaints; introduce a paid guarantee only after legal, financial and operational validation.

Reviews should be tied to verified transactions or clearly labelled as non-transaction feedback. Detect manipulation, permit provider responses and appeals, prohibit paid positive reviews.

## 12. Bookings, orders and payments

**RECOMMENDED transaction flow:** enquiry → quote if needed → customer approval → payment authorisation/collection → provider acceptance → scheduled/in progress → completion confirmation → settlement → review. Exact sequence depends on payment partner capability and law.

Do not call a request confirmed until provider acceptance and required payment conditions are met. Customers approve itemised quotes before payment.

Use a **regulated payment provider/partner** for collection, refunds and payouts. Maintain an append-only **double-entry ledger** in SYNERGY and reconcile it against provider transaction references and settlement reports. Do not treat an editable database balance as the source of truth for money movement. Use escrow-like or protected payment flows only where the licensed provider and law support them. **Do not claim legal escrow unless it truly is.**

Define cancellations, partial completion, refunds, chargebacks, non-delivery and dispute timelines.

**Payout controls:** verified beneficiary, risk checks, idempotency keys, limits, step-up verification, approval for high-risk transfers, immutable audit logs and reconciliation. Separate customer funds, creator payables, seller payables, refunds and platform revenue. Do not launch money movement before reviewing provider terms, KYC/KYB, tax, chargebacks and regulatory obligations.

## 13. Creator economy

**CONFIRMED**

- Creator ad revenue sharing is based on genuine engagement and watch time, not raw views alone.
- Split: **50% of net eligible advertising revenue to creators and 50% to SYNERGY**.
- Balanced earnings transparency: show breakdown and explain calculations. The creator pool is collective.

**RECOMMENDED allocation:** published weighted formula using qualified watch time, meaningful engagement, audience quality and content eligibility, with anti-fraud adjustments and caps. Publish the exact formula before monetisation; do not imply each creator automatically receives half of revenue attributable to their own video.

Define **net eligible ad revenue** narrowly. Recommended deductions: applicable taxes collected/remitted on ad sales, refunds, chargebacks, invalid-traffic adjustments, directly attributable ad-serving fees. Do not deduct unrelated overhead, founder salaries or general development costs.

**Dashboard:** qualified views/watch time, eligible ad impressions, engagement quality, estimated earnings, adjustments, finalised earnings, available balance, payout status and history. Distinguish estimates from finalised amounts.

**RECOMMENDED payout cadence:** monthly after a reasonable fraud/chargeback review. Minimum payout, methods, fees, identity checks and tax treatment remain to be set after provider validation.

Other creator income: tips, paid subscriptions, exclusive content, sponsorships, affiliate/product sales, partnership campaigns. No earnings guarantees or rewards for fake engagement. Provide demonetisation and invalid-traffic appeals.

## 14. Advertising

**CONFIRMED**

- Native in-feed ads; users scroll into ads and can skip immediately.
- Mixed formats: full-screen vertical video, image ads and text/image promotional posts; clearly labelled **Sponsored**.
- First ad after five organic posts; later ads after every 8–10 organic posts; no consecutive ads. (Initial defaults subject to testing.)
- Video ads muted by default; tap to unmute.
- Coarse location targeting only: country, state, city or broad service area. No precise GPS, private address, neighbourhood or distance targeting.
- Political ads restricted but permitted with verified sponsor, clear label, public spending records and public ad library; no anonymous political ads.
- Campaign creation supports both automatic and manual modes.

**RECOMMENDED:** campaign objectives include awareness, video views, website visits, product sales, service bookings, enquiries/messages and storefront visits. CPM, CPC and CPV billing only where measurement and fraud controls are reliable.

**RECOMMENDED, not confirmed:** prepaid advertiser wallet, daily budget caps, pause/resume, downloadable statements, no automatic top-ups unless explicitly enabled. Unspent funds remain available or are refunded under published terms; validate payments/legal requirements first.

Keep ads separate from organic ranking. Advertisers receive aggregate reporting, not viewer identities or exact locations. Do not sell private messages, contacts or sensitive personal information. Provide ad preference controls and broad explanations.

**Political ad library:** sponsor, verified advertiser, creative, dates, spend or disclosed range, broad target locations, aggregate impressions, active/archived status. Preserve archives. Ordinary political discussion is not paid political advertising.

**Ad review:** automated checks plus human review for higher-risk categories; report and appeal paths; advertiser verification where required; fraud monitoring. Prohibit scams, malware, illegal goods/services, counterfeits and fraudulent investment schemes. Restricted categories require enhanced review.

## 15. Subscriptions and fees

**RECOMMENDED tiers:** Free (core social/discovery/marketplace); Premium (optional ad-free eligible browsing and convenience features); Creator Pro (analytics and creator tools); Business Pro (storefront analytics, team tools, campaign management).

Never paywall safety, privacy, security, reporting, blocking, accessibility or basic data export. Prices and exact entitlements are **UNRESOLVED** pending local willingness-to-pay tests, provider fees, tax and app-store review. Clearly disclose recurring billing, renewals, cancellation and refunds.

Marketplace commission is not fixed. A working idea of 2%+ depending on transaction size was discussed but **no final schedule is approved**. Test a transparent fee against payment costs, fraud, support and provider economics. Disclose all tipping, paid-content, sponsorship and partnership fees before payment.

## 16. Creator Partnership Marketplace

**RECOMMENDED hybrid model:** businesses discover creators and publish campaigns; creators may also approach businesses and negotiate directly. Each campaign agreement defines deliverables, channels, deadlines, revision limits, payment and milestones, disclosure, content usage rights, exclusivity, cancellation and dispute handling. Paid partnerships are labelled. Creators retain ownership unless they expressly grant a defined licence or transfer. Businesses cannot demand undisclosed positive reviews. Use protected payment only where supported by a suitable regulated partner. Disclose SYNERGY fees.

## 17. Privacy, security and trust

**Privacy by design:** minimise data; document purpose and lawful basis; retention; access/correction/deletion procedures where applicable; encryption in transit and at rest; staff access limits; processor controls; cross-border transfer assessment; breach response. Do not use sensitive personal information for ad targeting. Keep private messages inaccessible to advertisers. Prefer aggregated/de-identified analytics with strict controls.

**Security baseline:** role-based access, least privilege, MFA for privileged staff, secure sessions, rate limits, abuse detection, encryption, secrets management, dependency scanning, backups and restore tests, audit logs, vulnerability reporting, incident response, secure releases.

**RECOMMENDED money safeguards:** append-only double-entry ledger, idempotent payment/payout requests, signed webhooks, reconciliation, separation of duties, transaction limits, step-up verification, alerts, manual review for unusual transfers. Ed25519 may be used for release/audit signatures only with a proper threat model and expert review. Avoid unnecessary cryptographic complexity.

Do not promise anonymity or untraceability. Promise only implemented, testable privacy/security controls.

## 18. Technical architecture

**CONFIRMED initial architecture**

- **Neon PostgreSQL** — primary application database.
- **Supabase Auth** — authentication and identity.
- **Cloudinary** — initial media storage, processing and delivery.
- **MongoDB** — reserved for future specialised analytics/recommendation event workloads, not core transactions.
- **No Firebase** unless a concrete need emerges.

Supabase Auth is the identity authority. Store its user ID in Neon; do not build a second password system. Enforce authorisation server-side and in database policies; never trust client-supplied roles.

**Core transactional data in Neon:** profiles, relationships, communities, listings, bookings, orders, payment references, ledger entries, subscriptions, moderation cases, governance proposals, audit metadata. Keep Cloudinary behind a media abstraction. Introduce MongoDB only when volume or specialised query needs justify it. Do not split balances/order state across databases without a consistency design.

**RECOMMENDED early architecture:** modular monolith, not premature microservices.

Modules: identity, profiles/social graph, content/media, feed, marketplace, payments/ledger, ads, creator earnings, messaging, moderation, notifications, governance, analytics.

Maintain development, staging and production environments with separate credentials/data. Never commit secrets or expose provider keys in browser/mobile bundles. Use protected environment secrets. **No GitHub Actions unless explicitly approved.** Add structured logs, metrics, uptime checks, error reporting, audit trails, cost dashboards and alerts.

## 19. Legal and compliance readiness

Before public launch, obtain Nigerian legal advice on company setup, beneficial ownership disclosure, Nigeria Data Protection Act 2023/NDPC obligations, consumer protection, advertising, payment flows, tax, IP, contractors and marketplace liability.

Prepare: Privacy Policy; Terms of Service; Community Guidelines; Advertising Policy; Creator Monetisation Agreement; Creator Sponsorship Agreement; Marketplace Seller Agreement; Refund/Cancellation/Dispute Policy; Copyright/IP Policy; Data Retention and Account Deletion Policy; moderation/appeals procedures. Documents must match actual product behaviour. Do not claim compliance, escrow, encryption, deletion or privacy guarantees without implementation and operational evidence.

Before entering each country, assess privacy/data transfers, consumer protection, digital services, ad/influencer disclosure, copyright, payments, tax, child safety and app-store requirements.

**App-store readiness:** privacy/data safety disclosures, account deletion, UGC reporting/moderation/blocking, age ratings, minimal permissions, secure payments, correct distinction between digital purchases and physical goods/services. Check current Apple/Google rules before submission.

## 20. Company, brand and intellectual property

**RECOMMENDED:** Nigerian operating company when commercial operations and legal duties justify it. Keep the public brand separate from the founder's public profile while complying with beneficial ownership and other disclosure laws. Separate company and personal finances. Defer a complex international holding company until traction or cross-border needs justify it.

Search and protect SYNERGY and SOAP names/logos in relevant trademark classes and markets before major investment. Domain registration is not trademark ownership. Secure official domains and social handles. Ensure contractors assign work product and source files appropriately. Creators retain original content ownership by default; for sponsorships, define licence/transfer, duration, territory, media and paid-ad usage.

## 21. Support, moderation and operations

**Support:** in-app help centre, tickets, safety reporting, payment/refund support, account recovery and appeals. Prioritise compromised accounts, money movement, threats and personal safety. Publish response expectations and escalation routes. Track first response/resolution time, reopened cases, refund outcomes, report accuracy and satisfaction.

**Moderation categories:** allowed, restricted, prohibited. Use context-sensitive review, evidence handling, notice, proportionate enforcement and appeal. Staff tools require least privilege, reason codes, audit logs and separation of duties. Moderator access to private messages is limited to user-reported or legally justified cases and recorded.

## 22. Business model and financial discipline

Revenue channels: advertising; marketplace commissions; subscriptions; creator/business tools; paid-content fees; optional disclosed tipping fees; Creator Partnership Marketplace fees and other disclosed commerce services. The 50/50 creator/platform ad split is confirmed. Publish deductions, allocation formula, payout rules and adjustment/appeal process. Never quietly change the split.

Start with free/low-cost infrastructure, usage limits and feature flags. Monitor media storage, transcoding, bandwidth, database, payment, support and moderation costs. Do not buy scale before usage proves it is needed. No unlimited free media. Separate GMV, collected revenue, taxes, payment fees, refunds, creator/seller payables, platform net revenue and operating costs.

## 23. Metrics and launch gates

- **Product:** activation, WAU/MAU, retention, feed satisfaction, meaningful interactions, creator retention, community participation, search success, accessibility.
- **Marketplace:** listing quality, enquiry-to-booking conversion, provider acceptance, completion, cancellation, refund, dispute, repeat purchase, provider earnings.
- **Creator:** qualified watch time, valid ad impressions, creator pool, payout accuracy, earnings concentration, retention, fraud adjustments.
- **Advertising:** advertiser activation, campaign completion, cost per result, invalid traffic, complaints, ad load, satisfaction, sponsor transparency.
- **Safety:** report severity/response, repeat offenders, appeal overturn rate, fraud losses, account compromise, privacy incidents, moderation consistency.
- **Reliability/cost:** uptime, crash-free sessions, latency, media processing success, bandwidth/user, storage growth, cost/active user.

**No public launch** until account security, reporting/blocking, privacy/terms, moderation workflow, backup/restore, incident response, support ownership and cost alerts are tested. Payments require tested reconciliation and refund/dispute operations.

## 24. Principal risks and mitigations

- **Media costs:** upload limits, compression, adaptive delivery, provider abstraction, cost alerts.
- **Marketplace fraud:** proportionate verification, clear states, transaction evidence, payment controls, disputes.
- **Creator payout abuse:** qualified metrics, anomaly detection, delayed finalisation, auditability, appeals.
- **Governance capture:** fixed eligibility snapshot, anti-Sybil checks, secret ballots, public tally verification, independent review.
- **Server centralisation:** open SOAP, independent operators, signed releases, audits, portability, transparent deviations.
- **Regulatory exposure:** jurisdiction-specific review before new payment, advertising, data or content features.
- **Scope overload:** phases, exit criteria, modular monolith, deferral of live streaming/complex features.

## 25. Gaps closed with recommended defaults

Planning defaults, **not** confirmed user choices:

1. Voting eligibility: account age 90 days, verified email, activity on 6 distinct days in prior 90 days, proportionate anti-Sybil checks.
2. Voting quorum: 60% participation in addition to the confirmed 50%-of-eligible-population YES threshold.
3. Include block, mute, restrict and report in the first public release.
4. Separate organic, sponsored and marketplace ranking; offer chronological feed and explanations.
5. Modular monolith first; defer microservices and MongoDB until justified.
6. Regulated payment partner, append-only double-entry ledger, reconciliation, idempotency; no unsupported escrow claims.
7. Monthly creator payout after fraud review; exact minimum/threshold set after provider validation.
8. Creator pool formula uses qualified watch time, meaningful engagement, quality, anti-fraud adjustments; publish before monetisation.
9. Free, Premium, Creator Pro and Business Pro tiers; prices/entitlements open.
10. Do not charge the discussed ₦5,000 guarantee deposit until liability and operations are validated.
11. Advertiser wallet, CPM/CPC/CPV, exact commission and campaign billing remain proposals.
12. Defer live streaming until safety and cost operations are ready.
13. Web and Android first; iOS later subject to resources and validation.

## 26. Implementation rules for AI agents and contributors

This blueprint is the source of truth. Read it and task-specific requirements before work. Do not treat recommendations as confirmed user decisions. Use `task/` files for scoped work. Each task states objective, scope, exclusions, acceptance criteria, test plan, security/privacy impact, cost impact and dependencies. Work on a dedicated task branch. Do not modify unrelated repositories/features or introduce paid vendors, databases or major architecture changes without approval.

After each task, create/update `handoff/` for the next agent: changed files, implementation details, decisions, commands, test/build results, known limitations, security notes, design tokens/patterns, migrations and next steps.

Visual direction: dark navy + mint green. Interfaces must be responsive, accessible, legible and usable on lower-cost Android devices and slower networks. Avoid unnecessary dependencies and unused code. Never expose secrets in source, logs, browser bundles, screenshots or customer UI. Do not claim tests passed unless run; distinguish simulated tests from real-provider tests. **No GitHub Actions unless approved.** Do not merge/deploy production changes without required review. Money, identity, privacy, governance and moderation changes require independent review before production.

## 27. Glossary

- **Eligible active voting population** — frozen set of accounts allowed to vote on a constitutional proposal.
- **Fundamental algorithm change** — change to protected recommendation objectives, visibility rights, ad/organic separation, governance, transparency or protocol structure.
- **Net eligible advertising revenue** — collected ad revenue after only published allowable deductions.
- **Qualified watch time** — [definition continues in the source PDF; see §27 there before implementing creator payouts].
