import { defineConfig } from "drizzle-kit";

/**
 * Migration/output boundary for the modular monolith (ADR-0006: `db/` holds
 * migration history; ADR-0004: Drizzle, reviewable additive SQL migrations,
 * history is the source of truth).
 *
 * SCHEMAS live with their modules (`web/src/modules/<domain>/schema.ts`). The
 * FIRST real migration belongs to the identity/profile slice (TASK-006A/006B)
 * — this task deliberately introduced no tables, so `db/migrations` starts
 * empty until then.
 *
 * `npm run db:generate` needs only schema sources (no database).
 * `npm run db:migrate` needs DATABASE_URL and NEVER runs against production
 * without review (AGENTS.md migration rules).
 */
export default defineConfig({
  dialect: "postgresql",
  // Read from the environment only, and only by `db:migrate` (which needs a
  // live connection). The value is never printed by drizzle-kit or by our
  // scripts, and never committed. `db:generate` works with it unset.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Resolved from the repo root (where `npm run db:generate` runs), so the
  // reviewable SQL history lands inside the documented `db/` boundary.
  out: "./db/migrations",
  schema: [
    // Wildcards keep the single-migration-tool rule while letting each module
    // own its schema file. Paths resolve from the repo root, where the npm
    // script runs. TASK-007 added the first schema module (member profiles).
    "./web/src/modules/*/schema.ts",
  ],
});
