ADR-0010 — Cost and infrastructure proposal for Phase 0/Phase 1

Status: RECOMMENDED (pending owner approval)

Purpose
Present the cheapest-viable and free-tier-aware hosting/provider options for Phase 0 and Phase 1, with explicit triggers for paid usage, and request owner approval before anything is purchased or provisioned. Nothing in this ADR incurs cost. Provisioning is a separate owner gate (G-2 for the dev projects; any paid plan is a separate approval).

Constraints from approved documents
- `MASTER_BLUEPRINT.md`: Neon PostgreSQL, Supabase Auth, Cloudinary; low-cost start; monitor media/storage/transcoding/bandwidth/database/payment/support/moderation costs; do not buy scale before usage proves it; no unlimited free media; providers replaceable; costs observable.
- `SYSTEM_ARCHITECTURE.md`: separate dev/staging/prod environments with separate credentials/data.
- `SECURITY_RULES.md` + `ADR-0007`: secrets are server-side and environment-separated.
- `QUALITY_GATES.md` + `MASTER_BLUEPRINT.md`: no GitHub Actions unless approved; quality runs locally.

Infrastructure categories and the cheapest viable option for each (RECOMMENDED for approval discussion)

1. Web application hosting
- RECOMMENDED starting point for discussion: a low-cost self-hostable server-side Node/JavaScript runtime, or a free/cheap initial managed host if it materially reduces early setup cost, with a documented migration path off the managed host if it becomes expensive at scale.
- Why this matters: `ADR-0001` is server-first, so the app is deployable as a server-side web app. The choice here is about cost and operational simplicity, not about whether the app can be server-side.
- Trigger for paid usage: traffic, serverless execution count, bandwidth, or managed-feature limits beyond the free/cheap tier.
- Recommendation: present at least two options — a free/cheap managed start and a self-hostable fallback — and record which is chosen and why.

2. Database
- RECOMMENDED: Neon PostgreSQL free/development tier for early development, with awareness that production-scale usage may move into paid tiers.
- Trigger for paid usage: storage, connection, or compute beyond the free/development limits.
- Recommendation: do not assume the free tier is enough for production; budget for production when usage exists, not before.

3. Identity
- RECOMMENDED: Supabase Auth free/development tier for early development.
- Trigger for paid usage: platform limits, feature needs, or usage beyond the free tier.
- Recommendation: keep auth backend replaceable at the adapter boundary so a future cost/lock-in problem is a swap, not a rewrite.

4. Media
- RECOMMENDED: Cloudinary free/development tier for early development, behind the `MediaProvider` interface (`ADR-0005`).
- Trigger for paid usage: storage, transcoding, bandwidth, and request volume — video is the dominant variable cost once video starts.
- Recommendation: enforce upload/retention/format/quality limits in application logic so media cost is controlled by design, not hoped for from the provider free tier.

5. Background jobs / caching / auxiliary services
- RECOMMENDED: introduce only when there is a concrete need. Do not add Firebase or another auxiliary provider without an approved need (`MASTER_BLUEPRINT.md`).
- Trigger for paid usage: real need + the chosen provider’s pricing.

6. Secrets/storage for environment variables
- RECOMMENDED: use the hosting/platform’s protected environment secret storage for production/staging credentials, and local env files (gitignored) for development.
- Cost: typically part of the hosting environment; not a separate paid product by default.

Cost discipline principles
- Start free/low-cost; monitor usage; do not buy scale before usage proves it.
- Keep media costs observable and capped by application logic.
- Keep providers replaceable so cost/lock-in problems are addressable.
- Do not commit to a paid host, paid database tier, paid media tier, or paid auxiliary service in this planning task.

What is NOT approved here
- No Neon/Supabase/Cloudinary project creation, credentials, or paid plans are approved by this ADR.
- No deployment is approved.
- No provider is committed; each is presented as the RECOMMENDED starting point for the owner’s approval decision.

Security and cost impact
- Security: the cost proposal must not leak into the client bundle or repo (`ADR-0007`); credentials are environment-scoped.
- Cost: the proposal exists to make cost visible and to avoid accidental paid commitments; the real cost impact is deferred until the owner provisions and/or approves paid tiers.

Open dependencies
- `ADR-0001` (web framework) and `ADR-0006` (layout) for deployability.
- `ADR-0005` (media provider) for the media cost-control boundary.
- `ADR-0007` (env/secrets) for environment separation and secret handling.
- Gate G-2 for provisioning free-tier dev projects.
- Owner approval for any paid plan or production hosting choice.
