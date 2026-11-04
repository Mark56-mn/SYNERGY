ADR-0003 — Authorisation model for Supabase Auth with a Neon-hosted database

Status: RECOMMENDED (pending owner approval)

Context
Supabase Auth is the approved identity authority (MASTER_BLUEPRINT.md, D-013 direction; MVP_SCOPE.md Phase 1 item 1). Neon PostgreSQL is the approved primary database. This is a split-provider combination: Supabase's row-level-security helpers (`auth.uid()`, `auth.jwt()`) live inside the Supabase database. On Neon they do not exist. “Enforce authorisation at the data/API boundary, not only in UI” (SECURITY_RULES.md) and “Row-level/data access policies where applicable” (SECURITY_RULES.md) must therefore be solved explicitly, not assumed to come from Supabase RLS.

Constraints from approved documents
- SECURITY_RULES.md: enforce authorisation on the server/data layer for every protected resource; explicit ownership and role checks; least privilege; parameterised queries; never treat a mutable balance as the only source of truth (relevant when money is in scope, even though payments are DEFERRED).
- SYSTEM_ARCHITECTURE.md: server-authoritative auth and authorisation; explicit ownership and role checks for every protected operation; deny-by-default; parameterised queries.
- MVP_SCOPE.md: test cross-user access denial; add negative tests for unauthorised access and malformed input.

Options considered
1. Service-layer authorisation, deny-by-default, with explicit ownership checks at every protected operation (RECOMMENDED)
   - The server verifies the session/identity from Supabase Auth, then every protected operation runs an ownership/role check before touching data. Data access uses parameterised queries through a DB client. Database policies (if any) are an extra layer, not the only layer.
   - Works cleanly with Neon. No dependence on Supabase-specific RLS helpers.
   - Requires discipline: every protected endpoint and every repository method that touches a user-scoped resource must assert ownership/role. Negative tests required for each protected resource.
   - Consequence: authz logic lives in service code, which is reviewable and testable — but it must be audited as the surface grows.

2. Request-scoped JWT claims with Postgres RLS on Neon
   - If Neon can be configured to validate a Supabase-issued JWT (or a project-issued signed claim) per request and expose it to RLS, then RLS can express user-scoped policies directly in the database.
   - This is the Supabase “normal” path, but it is not automatic here because the DB is Neon, not Supabase. It requires a working end-to-end verification of the JWT/claim path on Neon before any data-access code is written.
   - If verified end-to-end, this can reduce the surface of per-query ownership checks. If not verified, it is a false economy: invisible authorisation that looks like Supabase RLS but is not.
   - Consequence: high review value if it actually works on Neon; risky if treated as equivalent to Supabase RLS without proof.

3. Hybrid (service layer as primary, RLS as supplementary where provable)
   - Service-layer denial-by-default is the guarantee; RLS is an extra defence only where the Neon-JWT path is demonstrably working.
   - Most robust, most reviewable.

Decision
RECOMMENDED: service-layer authorisation with deny-by-default and explicit ownership/role checks on every protected operation, parameterised queries, and per-protected-resource negative tests. RLS on Neon is permitted only as a supplementary layer where the JWT/claim path is verified end-to-end before it is relied upon; it is never the sole authorisation mechanism.

This keeps authorisation reviewable, testable, and independent of Supabase's database-specific helpers — which is exactly the constraint of hosting Supabase Auth with Neon.

Authorisation model in words
- Identity authority: Supabase Auth only. Store `supabase_user_id` (UUID) as the profile key. No password column ever.
- Session verification: server-side, from Supabase Auth, before any protected work. Client-side state is not security.
- Ownership model: most resources are owned by a single `supabase_user_id` (or by a provider profile owned by one user). Shared resources (communities, marketplace listings, messages) have an explicit membership/role model decided per module.
- Default: deny. Any path that does not positively establish the caller's right to act on the resource is rejected.
- Enforcement points: service layer for business rules and ownership; DB client for parameterised queries; optional RLS only where verified.

Test matrix (the negative tests AUTHORISATION MUST HAVE)
These are the negative tests the plan requires for the initial protected resources. They are named here so TASK-005/identity task can implement them; they are not passing claims.

For profiles:
- User A can read and update User A's own profile.
- User A cannot read User B's private profile fields (and cannot infer them from API shape or errors).
- User A cannot update User B's profile at all (403-equivalent, server-side denial).
- Unauthenticated requests to protected profile endpoints are denied.
- Session invalidation/revocation stops further access (lifecycle, where Supabase Auth supports it).

For content (owner-scoped, MVP text/image first):
- User A can create/read/update/delete their own content.
- User A cannot create/update/delete User B's content.
- Visibility rules (public/private) are enforced at read time; a private item is never returned to a non-entitled caller, including via searches, feeds or caches.

For the follow graph:
- Follow/unfollow is owner-scoped; you cannot mutate someone else's connections.
- Follow visibility settings are honoured when feeds/listings are built.

For marketplace (owner-scoped provider listings):
- Only the listing owner can update/delete their listing.
- Enquiry flow is permission-aware; pre-hire messaging cap (10 messages/person, including voice notes — CONFIRMED D-006) is enforced server-side.

For any future money path (DEFERRED — not implemented, but the control shape is decided now):
- Append-only, auditable double-entry ledger; no mutable balance as sole source of truth (MASTER_BLUEPRINT.md financial safeguards; SECURITY_RULES.md).
- Idempotency, signed webhook verification, reconciliation, refund/dispute handling, beneficiary verification, strict access controls.
- These are design commitments now so they are not retro-fitted after money touches the system.

Security and cost impact
- Security: this ADR is the single most important foundation decision. A wrong choice here either creates an IDOR/BOLA-prone system or forces a costly rewrite after protected endpoints exist. The recommended model prioritises reviewability and testability over convenience.
- Cost: no direct cost. The cost is engineering discipline: ownership checks and negative tests everywhere protected resources exist.
- Privacy: private profiles/content must never leak through search, feeds, previews, API responses or caches (SECURITY_RULES.md). Authorisation is the control.

Open dependencies
- D-03 (authorisation model) — this ADR is the proposed resolution; owner approval required.
- This decision is independent of the web framework (ADR-0001) and the data tooling (ADR-0004), but those implementations must honour it.
- RLS-on-Neon verification is a concrete technical investigation, not a product decision; if the owner/wants RLS as primary, the investigation and its result must be recorded before any protected endpoint is written.
