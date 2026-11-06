# db/ — migration and data-access tooling boundary

`db/` holds the migration history (source of truth) and the drizzle-kit
configuration. Schemas live beside their modules (`web/src/modules/<domain>/schema.ts`);
cross-module reads go through public services, never direct table imports
(ADR-0004, ADR-0006).

## Current state

- No migrations exist yet BY DESIGN: TASK-003 introduced no tables. The first
  real migration lands with the identity/profile slice (TASK-006A/006B), after
  the owner provisions development projects (gate G-2).

## Commands (local only; nothing provisioned here)

```bash
npm install           # root workspaces
npm run db:generate   # generate a reviewable SQL migration from module schemas
npm run db:migrate    # apply pending migrations — needs DATABASE_URL in .env
```

## Rules (ADR-0004)

- Ordered, reviewed, additive by default; destructive migrations are a
  flagged exception with explicit review and a documented forward/rollback plan.
- Review the generated SQL before committing; never hand-edit applied history.
- Never point `db:migrate` at a production database without owner authorisation.
