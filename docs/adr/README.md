Draft README for the ADR register. Status: RECOMMENDED pending approval. Not normative.

# Architecture Decision Record Index

> STATUS: RECOMMENDED — these decisions require owner review before implementation depends on them. They are draft proposals, not CONFIRMED product rules. See `AGENTS.md` and `DECISION_REGISTER.md` for the CONFIRMED / RECOMMENDED / UNRESOLVED distinction.

This register records material architecture choices so later agents and reviewers can see *why* a decision was made, what was rejected, and what the consequences are. It is created per `SYSTEM_ARCHITECTURE.md`.

| ID | Title | Status |
|-----|-------|--------|
| ADR-0001 | Web application framework and rendering strategy | RECOMMENDED |
| ADR-0002 | Android delivery path and its cost | RECOMMENDED |
| ADR-0003 | Authorisation model for Supabase Auth with a Neon-hosted database | RECOMMENDED |
| ADR-0004 | Migration and data-access tooling | RECOMMENDED |
| ADR-0005 | Media provider boundary (MediaProvider interface) | RECOMMENDED |
| ADR-0006 | System context, container/module diagram, trust boundaries, auth flow, media upload flow, deployment topology, data lifecycle | RECOMMENDED (reference doc) |

For every ADR: context, options considered, decision, consequences, security/cost impact, and open dependencies. An ADR becomes CONFIRMED only after the owner approves it; material changes during implementation require a new ADR or a superseding entry.

**How to read these:** each decision below is labelled RECOMMENDED. That means: this is the default this plan proposes, it is coherent with the approved blueprint/MVP/architecture/security documents, and it should guide planning — but it must not become an irreversible product rule without human approval. If you disagree with any of them, the correct next action is to record that disagreement as an open item and request a decision; do not silently substitute another implementation.
