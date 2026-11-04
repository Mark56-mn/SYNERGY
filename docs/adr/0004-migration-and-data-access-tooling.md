ADR-0004 — Migration and data-access tooling

Status: RECOMMENDED (pending owner approval)

Context
We need one migration tool and one data-access approach for Neon PostgreSQL, used by the module monolith. Migrations must be ordered, reviewable, additive, and safe (SECURITY_RULES.md: safe migrations and documented recovery; SYSTEM_ARCHITECTURE.md: parameterized queries; MVP_SCOPE.md: test cross-user isolation). We also need a way to run migrations and a way to write data access that honours ADR-0003 (service-layer denial-by-default, ownership checks, parameterised queries).

Constraints from approved documents
- SYSTEM_ARCHITECTURE.md: ordered, reviewable, additive migrations; document rollback/forward-recovery; never run destructive production migrations.
- SECURITY_RULES.md: parameterised queries; enforce row-level/data access policies where applicable; test cross-user access denial; never disable a security control merely to make a test pass.
- ADR-0003: authorisation is service-layer first; database helpers are not the authorisation guarantee on Neon.

Options considered
1. Drizzle ORM + Drizzle migrations (RECOMMENDED)
   - Schema-as-code, typed, works well with TypeScript; migrations are generated/reviewable; lightweight.
   - Can colocate schema, queries and migration files with each module (consistent with the modular monolith layout).
   - Migration generation and review must still be disciplined; tooling helps, it does not replace review.
   - Consequence: tight TypeScript integration; migration history stays reviewable; strong fit for a TS server-side app.

2. Prisma
   - Strong typing and migration story; large ecosystem.
   - Heavier than Drizzle for some use cases; the team should pick one and stick to it.
   - Consequence: similar review properties if used well; the decision is primarily a taste/ecosystem/co-location judgement, not a security one.

3. Plain SQL migrations + a thin SQL runner, with hand-written queries
   - Maximum explicitness; every query is visible.
   - More boilerplate; less type safety at the query level unless paired with a codegen.
   - Consequence: answers “what does the DB actually do?” very directly, at the cost of more manual work.

Decision
RECOMMENDED: one typed ORM or query builder with a reviewable migration tool, chosen in the scaffold task (TASK-003) from Drizzle or Prisma, with plain-SQL migrations as the underlying source of truth for the migration history. Whichever is chosen:
- One migration tool only.
- Migrations are ordered, reviewed, additive by default; destructive migrations are a flagged exception requiring explicit review and a documented forward/rollback plan.
- Data access is parameterised; no string-building of queries.
- Each module owns its schema and queries through its public service; cross-module reads go through services, not raw shared table imports.
- Negative tests for cross-user access denial accompany each protected resource (ADR-0003 test matrix).

Authorisation relationship
This ADR does not solve authorisation. It assumes ADR-0003: the ORM/query builder is the parameterised-query mechanism; ownership/role checks are in service code; database policies, if any, are supplementary and only where verified.

Security and cost impact
- Security: parameterised queries are mandatory; migration review prevents unsafe schema changes; cross-user isolation tests protect against IDOR/BOLA. The tooling choice is mostly about ergonomics and reviewability, not security — security is determined by how it is used.
- Cost: no direct cost; the cost is review discipline.

Open dependencies
- D-04 (migration/ORM tooling) — this ADR narrows it to a concrete choice between reviewed options; owner approval picks the implementation.
- Runs in the scaffold task (TASK-003); it must not silently switch tooling later without an ADR.
