Diagrams and system context (TASK-002 deliverable)

Standing assumption: this repository at the time of writing contains only markdown, a one-line README, LICENSE, and the task/governance documents. There is no application code, no database, and no deployed environment. Diagrams are therefore design documents, with assumptions labelled, not evidence of a running system.

System context (who and what this system talks to)
- Users (people and providers) interact through a web app (Next.js, ADR-0001) and, for MVP, an installable PWA (ADR-0002) on Android.
- The system authenticates users through Supabase Auth (identity authority).
- The system stores profiles, content, social graph, marketplace, community, messaging and other data in Neon PostgreSQL.
- The system processes/stores/delivers media through Cloudinary, behind the MediaProvider interface (ADR-0005) — and only when the owner has created a free-tier development project and the system is provisioned for it.
- The system uses email-based auth flows (passwordless magic-link / email OTP) as the MVP sign-up/in/recovery path via Supabase Auth, with server-side session verification.
- Trust boundaries: the client browser is untrusted; the server is authoritative for auth, policy, data and secrets; Supabase Auth and Cloudinary are external providers with their own boundaries; Neon is the data boundary (no Supabase RLS helpers).

Container/module diagram (internal shape)
- Web app container: Next.js App Router. Server components/actions + server utilities hold auth, policy, secrets, data access. Client components are pure UI, receiving already-authorised, already-shaped data.
- Module monolith: src/modules/<domain> with identity, profiles, social graph, content, media, feed/discovery, communities, messaging, marketplace, trust-and-safety, notifications. Each module exposes a public service; cross-module access goes through that service.
- Server-only layer: src/server — sessions/authorization, DB client, provider adapters. Must never be imported by client components.
- Shared UI primitives: src/components/ui, built from design tokens (DESIGN_SYSTEM.md).
- Shared pure code: src/lib — utilities and types without side effects.
- DB: db/migrations (ordered, reviewed, additive), plus the chosen data-access tooling (ADR-0004).
- Docs: docs/adr (this register); handoff/ and task/ for workflow.

Design rule that the diagram must enforce
- No cross-module imports except through a module's public service.
- Server-only code must not leak into the client bundle.
- Every protected operation asserts ownership/role (ADR-0003).
- Media, auth, notifications, and later payments are behind adapters, not directly inline.

Trust boundaries (people, providers, data)
- Trusted internal: server-side services, DB client, provider adapters (when used server-side), migration tooling, secret handling.
- Untrusted / least trusted: client browser, client-supplied input, client-supplied media metadata, webhook payloads from providers.
- External providers: Supabase Auth (identity), Cloudinary (media, when provisioned). Treat their responses as input to validate, not as authority by default — except that Supabase Auth is the identity authority for identity (that is an approved assumption), and its session verification is server-side.
- Data boundary: Neon holds user data. Authorisation is enforced primarily in service code; RLS only if the Neon-JWT path is verified.

Auth/session flow (MVP, email-based via Supabase Auth)
- Sign-up / sign-in / recovery: user provides email; Supabase Auth handles the email flow; server verifies the resulting session.
- Session verification: server-side, before any protected operation.
- On verified identity: look up or create the profile keyed by `supabase_user_id`; apply ownership/role checks per ADR-0003.
- Sign-out / revocation: server honours Supabase Auth session lifecycle where supported.
- Negative tests required: unauthenticated requests denied; user A cannot act on user B's resources; visibility rules enforced at read time; session lifecycle honoured.

Media upload flow (when media is enabled, behind MediaProvider interface)
- Caller requests to attach media to a resource.
- Server authorises the upload request (ADR-0005: request upload authorisation).
- Server asks the adapter for a signed/provider-controlled upload mechanism.
- Client completes upload through the provider; server receives/upload-completes and records an asset entry (owner, target resource, media type, intended use, transforms, moderation status = pending).
- Derivation/transforms, moderation, and delivery are separate seams. Listing media is capped (3 pictures / 2 videos) and video length is bounded (3/10/30 min).
- Delivery URL is issued only when the asset is entitled to be delivered (ownership + moderation state).
- Local stub adapter lets tests run without Cloudinary credentials.
- Note: real media requires the owner to create a free-tier Cloudinary development project (G-2). Until then, the interface and stub are the testable surface.

Deployment topology (proposed, not provisioned)
- Environments: development, staging, production — separate (SYSTEM_ARCHITECTURE.md).
- Web app: one server-side artefact per environment. Static media delivered through the media provider where applicable; no raw user media served from the app container arbitrarily.
- Database: Neon per environment, with migrations applied in order.
- Identity: Supabase Auth per environment.
- Secrets: in environment secret storage / env config; never in repo, client bundle, logs or screenshots.
- No CI without approval (G-5); local quality tooling runs per task.

Data lifecycle (general)
- Create: through a module's public service, with ownership/role checks; parameterised writes; audit log for privileged/sensitive actions.
- Read: through services; visibility/ownership enforced at read time; private data never leaked through search/preview/feed/cache/API shape.
- Update: through services, with ownership checks; only the entitled caller can mutate a resource; changes logged where sensitive.
- Delete/retention: apply retention, deletion, export and backup handling per SECURITY_RULES.md; soft vs hard delete decided per resource with recovery in mind; never rely on a mutable balance as the only financial source of truth when money is in scope (DEFERRED).
- Background/async: media processing and asynchronous work via background jobs where needed (SYSTEM_ARCHITECTURE.md).
- Idempotency: handlers that can be retried (webhooks, uploads) are idempotent.

Data model (initial profiles + identity slice — illustrative)
- users / identities: keyed by Supabase Auth `supabase_user_id` (UUID). Profile record tied to that ID. No password column.
- profiles: owned by one identity; public/private visibility fields; privacy settings; minimal PII; audit for sensitive updates.
- follow graph: owner-scoped follow/unfollow; visibility settings honoured in feeds.
- content (MVP text/image): owned by one identity; visibility; moderation state placeholder.
- media assets: owned by one identity; target resource; media type; intended use; upload reference; transforms; moderation status; delivery guarded by ownership + moderation state.
- provider/marketplace (Phase 1): provider profiles; listing media capped at 3 pictures / 2 videos; enquiry flow permission-aware; pre-hire messaging cap enforced server-side (D-006 = 10 messages/person including voice notes).

Assumptions labelled
- Supabase Auth email-based auth works as the MVP path; onboarding/recovery UX and rate limits must be designed and tested (not assumed delivered).
- Cloudinary features used are those needed for MVP media; transcoding/adaptive delivery for video is a later concern (MVP is text/image first; video pipeline when costs/processing are controlled).
- Neon-JWT/RLS path is not assumed; ADR-0003 governs authorisation.
- The app is deployable as a server-side web app; the hosting decision is separate (cost proposal, owner approval).
- PWA installability and push on lower-cost Android are properties to verify, not guarantees.
