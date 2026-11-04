# System Context, Container/Module Diagram, Trust Boundaries, Flows, Deployment Topology, and Data Lifecycle

Status: RECOMMENDED reference document for TASK-002. Not a product decision; not normative by itself. Assumptions are labelled.

Standing assumption: at the time of writing this repository contains only markdown, a one-line `README.md`, `LICENSE`, and the governance/task documents. There is no application code, no database, and no deployed environment. Diagrams here are design documents with labelled assumptions, not evidence of a running system.

## 1. System context

### Actors
- Members / creators / providers / advertisers / moderators / administrators — human roles represented by one Supabase Auth account that may hold multiple roles (`DECISION_REGISTER.md` D-001 to D-004; `MASTER_BLUEPRINT.md` roles).
- Guests / unauthenticated visitors — read-only or limited public surfaces where the product allows them.
- Staff operators — moderator/support and admin/security roles with least-privilege tooling.

### External systems
- Supabase Auth — identity authority for sign-up, sign-in, session, recovery. MVP path is email-based (`MASTER_BLUEPRINT.md` §4; `DECISION_REGISTER.md` D-013 direction).
- Neon PostgreSQL — primary application database. No Supabase RLS helpers exist here; authorisation is primarily service-layer (`ADR-0003`).
- Cloudinary — initial media storage/processing/delivery, reached only through the `MediaProvider` interface (`ADR-0005`). Real media requires the owner to create a free-tier development project (gate G-2).

### What this system does at a high level
- Authenticates users through Supabase Auth and stores the resulting identity key in Neon.
- Lets users establish profiles, follow and connect, publish and discover content, find providers/listings, make enquiries, and use safety controls.
- Keeps organic, sponsored, and marketplace ranking distinguishable by construction (`MASTER_BLUEPRINT.md` §8/§14).
- Keeps the media, auth, and notification backends behind adapters so providers are replaceable (`SYSTEM_ARCHITECTURE.md`).

### Trust boundary summary
- Untrusted: browser client, client-supplied input, client-supplied media metadata, webhook payloads from providers.
- Trusted internal: server-side services, the DB client, provider adapters when used server-side, migration tooling, secret handling.
- External providers have their own boundaries; their responses are validated input unless the document explicitly grants them authority (Supabase Auth is the identity authority for identity; that is an approved assumption, and its session verification is server-side).

## 2. Container and module diagram

### Containers
1. **Web app (Next.js App Router)** — the primary server-side web container (`ADR-0001`). Server components, server actions, and server utilities hold auth, policy, secrets, and data access. Client components are pure UI that receive already-authorised, already-shaped data.
2. **Installable PWA (MVP Android)** — same web artefact installed on Android for Phase 1 (`ADR-0002`). No separate native monolith; one server-side surface.
3. **Neon PostgreSQL** — transactional data boundary.
4. **Supabase Auth** — identity boundary.
5. **Cloudinary (behind MediaProvider)** — media boundary when provisioned.

### Module boundaries inside the web app
Proposed module layout for the modular monolith:
- `src/app` — route layer (pages, layouts, server/parsing boundaries).
- `src/modules/<domain>` — domain modules: identity, profiles/social-graph, content, media, feed/discovery, communities, messaging, marketplace, trust-and-safety, notifications, and later advertising/creator-economics/governance/analytics.
- `src/server` — server-only concerns: session/identity verification, authorisation helpers, DB client, provider adapters. This code must never be imported by client components.
- `src/components/ui` — shared UI primitives built from design tokens (`DESIGN_SYSTEM.md`).
- `src/lib` — pure/shared utilities and types with no side effects.
- `db/` — migrations (ordered, reviewed, additive) plus the chosen data-access tooling (`ADR-0004`).
- `docs/adr/`, `handoff/`, `task/` — planning and handoff artifacts.

### Import rules the diagram must enforce
- No cross-module imports except through a module’s public service.
- Server-only code must not leak into the client bundle.
- Media, auth, notifications, and later payments are reached through adapters, not inline vendor calls.
- Every protected operation asserts ownership/role (`ADR-0003`).

## 3. Trust boundaries

### Internal trust
- Server-side code is trusted to enforce policy, but it is still reviewed code, not magic. Least privilege applies inside the server too: the DB client used by a module should be scoped to what that module needs; provider adapters should be configured with the minimum credentials/scopes for the environment.

### External trust
- Supabase Auth is trusted as the identity authority. That means we trust Supabase Auth to authenticate the user; we do not blindly trust anything else the client sends.
- Cloudinary is trusted only within the bounds of the media contract: uploads go through the signed/provider-controlled mechanism, delivery is gated by ownership + moderation state, and client-supplied media metadata is not accepted as truth.

### Data boundary
- Neon holds user data. Authorisation is enforced primarily in service code. Row-level or data-access policies on Neon are supplementary only, and only if the Neon-JWT/claim path is verified end-to-end before it is relied upon (`ADR-0003`).

## 4. Auth and session flow (MVP, email-based via Supabase Auth)

1. User provides email; Supabase Auth handles the email sign-up/in/recovery flow.
2. The server verifies the resulting session server-side before any protected operation.
3. On verified identity, the system looks up or creates the profile keyed by `supabase_user_id` (UUID) and applies ownership/role checks per `ADR-0003`.
4. Sign-out/revocation honours Supabase Auth session lifecycle where supported.
5. Unauthenticated requests to protected endpoints are denied.
6. Negative tests required: user A cannot act on user B’s resources; private fields/items are never returned to a non-entitled caller, including through search, feeds, previews, caches, or API shape; session lifecycle is honoured.

## 5. Media upload flow (behind MediaProvider)

1. Caller requests to attach media to a resource.
2. Server authorises the upload request: the caller may attach media to that target resource (`ADR-0005`).
3. Server asks the adapter for a signed/provider-controlled upload mechanism.
4. Client completes the upload through the provider; server confirms completion and records an asset entry: owner, target resource, media type, intended use, upload/reference, transforms, and moderation status initialised to pending.
5. Derivation/transforms, moderation, and delivery are separate seams.
6. Listing-bound media is capped at 3 pictures and 2 videos; video length is bounded at ≤ 3 min / ≤ 10 min / ≤ 30 min at upload/processing time, not only in the UI.
7. A delivery URL is issued only when the asset is entitled to be delivered: ownership plus moderation state.
8. The local stub adapter implements the same interface with local/temporary storage and fake signed uploads, so integration/acceptance tests run without credentials.
9. Real media requires the owner to create a free-tier Cloudinary development project (gate G-2); until then the interface plus stub are the testable surface.

## 6. Deployment topology (proposed, not provisioned)

- Environments: development, staging, production — separate (`SYSTEM_ARCHITECTURE.md`).
- One server-side web artefact per environment.
- Neon per environment; migrations applied in order; separate data per environment.
- Supabase Auth per environment.
- Secrets in environment secret storage / env config; never in repo, client bundle, logs, or screenshots.
- No CI without approval (gate G-5); local quality tooling runs per task.
- Media delivered through the media provider where applicable; no arbitrary raw user media served from the app container.

## 7. Data lifecycle

### Create
Through a module’s public service, with ownership/role checks; parameterised writes; audit log for privileged/sensitive actions.

### Read
Through services; visibility/ownership enforced at read time; private data never leaked through search, preview, feed, cache, or API shape.

### Update
Through services with ownership checks; only the entitled caller mutates a resource; sensitive changes logged.

### Delete / retention
Apply retention, deletion, export, and backup handling per `SECURITY_RULES.md`. Soft vs hard delete is decided per resource with recovery in mind. When money is in scope (deferred), never rely on a mutable balance as the only financial source of truth.

### Async / background
Media processing and other asynchronous work go through background jobs where needed (`SYSTEM_ARCHITECTURE.md`).

### Idempotency
Handlers that can be retried — webhooks, uploads, payment-adjacent flows when they later exist — are idempotent.

## 8. Illustrative initial data model: profiles and identity slice

This is illustrative planning detail, not a schema commitment. The exact columns are decided during the identity/profile task.

- **identities** — keyed by Supabase Auth `supabase_user_id` (UUID). Profile record tied to that ID. No password column.
- **profiles** — owned by one identity; public/private visibility fields; privacy settings; minimal PII; audit for sensitive updates.
- **follow graph** — owner-scoped follow/unfollow; visibility settings honoured in feeds.
- **content (MVP text/image)** — owned by one identity; visibility; moderation status placeholder.
- **media assets** — owned by one identity; target resource; media type; intended use; upload reference; transforms; moderation status; delivery gated by ownership + moderation state.
- **provider/marketplace (Phase 1)** — provider profiles; listing media capped at 3 pictures and 2 videos; enquiry flow permission-aware; pre-hire messaging cap enforced server-side (`DECISION_REGISTER.md` D-006 = 10 messages per person including voice notes).

## 9. Labelled assumptions

- Supabase Auth email-based auth works as the MVP path; onboarding/recovery UX and rate limits must be designed and tested, not assumed delivered.
- Cloudinary features used are those needed for MVP media; transcoding/adaptive delivery for video is a later concern — MVP is text/image first, with the video pipeline only when media costs and processing are controlled (`MVP_SCOPE.md`).
- The Neon-JWT/RLS path is not assumed; `ADR-0003` governs authorisation.
- The app is deployable as a server-side web app; the hosting decision is separate and is covered by the cost proposal (`ADR-0010`), which is an approval ask.
- PWA installability and push behaviour on lower-cost Android devices are properties to verify, not guarantees (`ADR-0002`).
- Organic, sponsored, and marketplace ranking remain separate pipelines by construction; this document does not invent a final SOAP governance product — that remains a later phase (`MASTER_BLUEPRINT.md` §5/§10; `DECISION_REGISTER.md` D-010, D-020).
