ADR-0011 — SOAP architecture note

Status: RECOMMENDED (pending owner approval)

Purpose
Record how SOAP (SYNERGY Open Algorithm Protocol) should be designed into the architecture rather than bolted on, and state the confirmed constitutional voting rule precisely without inventing final eligibility/quorum mechanics where the blueprint leaves them unresolved.

Confirmed constraints
- SOAP is an open protocol for transparent and auditable recommendation systems and must be designed into the original architecture, not added later (`MASTER_BLUEPRINT.md` §1, §9; blueprint v1.0 §1, §9).
- Organic ranking, sponsored advertising, and marketplace ranking must remain distinguishable (`MASTER_BLUEPRINT.md` §8/§14; `DECISION_REGISTER.md` D-011; blueprint v1.0 §8/§14).
- Ranking must not optimise solely for watch time, clicks, or ad revenue (`MASTER_BLUEPRINT.md` §8; blueprint v1.0 §8).
- A fundamental algorithm-structure change requires YES votes from at least 50% of the eligible active voting population, with a 90-day voting period (`DECISION_REGISTER.md` D-010; blueprint v1.0 §10). This is not 50% of votes cast.
- Detailed eligibility mechanics, quorum, and independent verification remain proposed/recommended design details and must not be silently treated as approved (`DECISION_REGISTER.md` D-020; blueprint v1.0 §10).

What the architecture must support
- Separate ranking pipelines: organic, sponsored, and marketplace ranking should be implemented as distinguishable pipelines so that sponsored placements cannot secretly buy organic ranking and marketplace discovery is not conflated with either.
- Candidate ranking dimensions: relevance/relationship, quality/usefulness/originality, diversity/discovery, freshness, and creator opportunity, with watch time/engagement treated as signals that are adjusted for satisfaction, negative feedback, repeat exposure, spam/manipulation, and user choice.
- User controls: chronological/following feed, personalisation/topic controls, “not interested”, hide, mute, block, report, and plain-language explanations where feasible.
- Transparency and change history: recommendation principles, configuration ranges, deviations, and change history should be representable so that SOAP-style versioning, public change history, auditability, and conformance testing can be added later.
- Governance hooks: the system should be able to represent proposals, releases, review findings, appeals, and independent tally verification as first-class concerns when governance is in scope, without requiring a rewrite.
- Auditable operation: signed releases, audit logs, and portability/deviation recording should be supportable so that independent operators and audits can later verify behavior.

What this ADR does not decide
- It does not create the full SOAP governance product or certify any external protocol. That is a later phase.
- It does not finalize voting eligibility rules, quorum, or independent verification mechanics. Those remain UNRESOLVED/PROPOSED and are not approved for implementation here.
- It does not invent the final ranking formula, creator earnings formula, or ad load constants; those are product decisions with their own approval state.

Design implications for Phase 1
- Even though full SOAP governance is not in MVP, the ranking model and data flows should be built so that organic/sponsored/marketplace surfaces are separable and explainable from the start.
- Recommendation explanations, user controls, and visibility/eligibility rights should be representable in the data model and API shapes, so governance/audit features can be added without a retrofit.
- Any future fundamental algorithm-structure change should be gated by the confirmed constitutional process, and the codebase should not have a hidden bypass that lets a single officer/role permanently rewrite protected rules unilaterally.

Security and cost impact
- Security: separable ranking pipelines and auditable change history reduce the risk of hidden manipulation and make unauthorized policy changes detectable. Authority over protected rules must not be concentrated in a single role.
- Cost: mostly an architectural discipline cost. Keeping ranking separable and auditable is cheaper than retrofitting it after the feed is built.

Open dependencies
- `ADR-0003` (authorisation) for access control over protected surfaces.
- `ADR-0010` (cost) for hosting/provider cost discipline.
- The identity/profile, feed, marketplace, trust-and-safety, and moderation tasks for the concrete surfaces SOAP principles apply to.
- Owner approval for any final SOAP governance product, eligibility/quorum mechanics, and ranking constants.
