ADR-0006 — Repository layout and import boundaries for the modular monolith

Status: RECOMMENDED (pending owner approval)

Context
We need a repository layout that makes the modular monolith from `SYSTEM_ARCHITECTURE.md` mechanically enforceable in the scaffold task, including what may import what and how server-only code is prevented from reaching the client bundle. The layout must also leave room for the later Android client without destabilising the web MVP (`ADR-0002`).

Constraints from approved documents
- `SYSTEM_ARCHITECTURE.md`: modular monolith; domain modules; server-only code must not leak to the client bundle; provider adapters; separate dev/staging/prod.
- `SECURITY_RULES.md`: server-authoritative authz; secrets server-side only.
- `SYSTEM_ARCHITECTURE.md` + `ADR-0001`: Next.js App Router is the recommended web container, so server/client boundary rules must be expressible in that model.
- `MASTER_BLUEPRINT.md`: provider adapters (auth/media/notifications/payments); no Firebase without a concrete approved need.

Options considered
1. Domain-modules-first layout with a hard server-only layer (RECOMMENDED)
   - `src/app` for routes, `src/modules/<domain>` for domain services/schema/queries, `src/server` for server-only infra, `src/components/ui` for shared primitives, `src/lib` for pure utilities, `db/` for migrations and data-access tooling, `docs/` for planning.
   - Cross-module access goes through a module’s public service, not through importing another module’s internals.
   - Server-only enforcement is structural: server utilities, DB client, and provider adapters live under `src/server` (or in modules’ server-side code) and are kept out of client components through Next.js server/client boundaries plus lint/import rules in the scaffold.
   - Consequence: the architecture is reviewable and enforceable before product code is written; the layout itself encodes the security property from `SYSTEM_ARCHITECTURE.md`.

2. Flat feature folders without a distinct server-only layer
   - Simpler at first, riskier later: it is easier for client code to accidentally reach server-only utilities, and harder to keep adapter/authz boundaries consistent.
   - Not recommended for a product whose security posture depends on server-authoritative enforcement.

3. Micro-frontend or per-domain deployables
   - Premature for this product; conflicts with the modular monolith direction.
   - Not recommended now.

Decision
RECOMMENDED: domain-modules-first layout with a distinct server-only layer and explicit import rules, as the proposed default for the scaffold. The scaffold chooses the exact migration/data-access tooling (`ADR-0004`), but the layout does not depend on that choice except that `db/` and module data-access live in consistent places.

Proposed layout
- `src/app` — route layer: pages, layouts, and the server/client boundary points for the web app.
- `src/modules/<domain>` — one folder per domain module. Each module owns:
  - its public service API,
  - its schema/query shapes (subject to the chosen tooling in `ADR-0004`),
  - its server-side authorisation/ownership checks.
  - Cross-module reads/writes go through another module’s public service, not through that module’s internals.
- `src/server` — server-only infrastructure: session/identity verification, authorisation helpers, DB client bootstrapping, provider adapters. Should never be imported by client components.
- `src/components/ui` — shared UI primitives built from design tokens (`DESIGN_SYSTEM.md`).
- `src/lib` — pure/shared utilities and types with no side effects.
- `db/` — migrations and the chosen data-access tooling. Migration history is the source of truth (`ADR-0004`).
- `docs/adr/`, `handoff/`, `task/` — planning and handoff artifacts.
- Root config files for lint/format/typecheck/tests and for import-boundary enforcement (created in the scaffold task).

Import boundary rules
- Client components may only import from UI primitives, pure lib, and already-shaped data from server boundaries. They must not import server-only code.
- Server-only code must not be bundled for the client. The scaffold enforces this with Next.js server/client boundaries plus an import rule that flags forbidden server imports from client files.
- Modules may not reach into each other’s internals. If module A needs something from module B, it uses B’s public service.
- Provider usage is indirect: modules use adapters/services, not raw vendor SDK calls scattered through product code.

Android consideration
- For Phase 1 the web app is the shared surface, with an installable PWA for Android (`ADR-0002`). The layout therefore does not create a second client tree now.
- If a later native client is approved, the server-side boundaries are unchanged: the new client reuses the same server-side auth, policy, and media adapter seams. Any native-specific code stays out of the web app’s client bundle by construction.

Non-goals
- This ADR does not scaffold the repository. It proposes the layout so TASK-003 can execute it mechanically.
- It does not choose the ORM/migration tool; that is `ADR-0004` and is decided in the scaffold.

Security and cost impact
- Security: the layout encodes the `SYSTEM_ARCHITECTURE.md` server-authoritative property. It does not guarantee it — enforcement still depends on the scaffold rules and on later discipline — but it makes violationsVisible and preventable rather than accidental.
- Cost: no direct cost. A cleaner layout reduces later rework cost.

Open dependencies
- `ADR-0001` (web framework) — layout assumes a server-first Next.js App Router model for the web client.
- `ADR-0003` (authorisation model) — layout assumes service-layer ownership/role checks live in modules and `src/server`.
- `ADR-0004` (data tooling) — layout assumes `db/` and module data access; exact tooling decided later.
- `ADR-0005` (media provider) — layout assumes a media adapter seam reachable from server-only code.
