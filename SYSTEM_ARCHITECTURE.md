# SYNERGY System Architecture — Guardrails

## Architectural approach
Start with a modular monolith and clearly separated domain modules. Avoid microservices until measured scaling or team boundaries justify them. Prefer boring, well-supported technology and small replaceable adapters.

## Preferred infrastructure direction
- Primary relational database: Neon PostgreSQL.
- Identity: Supabase Auth; it is the identity authority. Do not create a second password store.
- Media: Cloudinary initially, behind a media-provider adapter.
- MongoDB: future specialised event/analytics workload only, not transactional source of truth.
- Firebase: do not introduce without a concrete approved requirement.
These are direction-level choices; provisioning, paid plans and secrets require human approval.

## Suggested domain boundaries
identity, profiles, social graph, content, media, feed/discovery, communities, messaging, marketplace, trust-and-safety, notifications, advertising (later), creator economy (later), governance/SOAP (later), audit/operations.

## Required design properties
- Server-authoritative authentication and authorisation.
- Explicit ownership and role checks for every protected operation.
- Data minimisation and tenant/user isolation where relevant.
- Provider adapters for auth/media/notifications/payments to avoid vendor lock-in.
- Background jobs for media processing and asynchronous work where needed.
- Idempotent handlers for retries and webhooks.
- Structured logs with sensitive values redacted.
- Health checks, error tracking, backups and restore procedures before public launch.
- Separate development, staging and production environments.
- No production credentials in repository, client bundle, logs or screenshots.

## Architecture decision records
For material choices, create `docs/adr/NNNN-title.md` with context, options, decision, consequences, security/cost impact and status. An agent may make reversible local implementation choices within an approved task; material infrastructure or product decisions need approval.

## Required diagrams/docs before substantial feature work
System context, container/module diagram, data model, trust boundaries, auth/session flow, media upload flow, deployment topology and data lifecycle. Mark assumptions explicitly.
