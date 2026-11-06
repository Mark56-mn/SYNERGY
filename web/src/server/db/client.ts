import "server-only";

import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import { getEnv } from "@/server/env";

/**
 * Database access boundary (Neon PostgreSQL via Drizzle — ADR-0004).
 *
 * - Parameterised access is the only access path: everything flows through
 *   Drizzle's typed, parameterised query builder. No string-built SQL helper
 *   is exported from this module (raw `pool.query(sql)` string interpolation
 *   stays out of reach).
 * - The client is created lazily per process and never connects outside
 *   actual query execution (pg pools connect on demand): with no Neon
 *   project provisioned yet, building and testing this app performs zero
 *   connections.
 * - Supabase-specific helpers (`auth.uid()`, `auth.jwt()`) are assumed NOT to
 *   exist on Neon (ADR-0003); nothing here references them, and every
 *   protected operation must still pass the service-layer ownership checks
 *   (web/src/server/authz/) regardless of what the database would allow.
 */

export type Database = NodePgDatabase<Record<string, never>>;

let cachedDb: Database | null = null;

/** Create a Drizzle client for the given connection string. */
export function createDb(connectionString: string): Database {
  const pool = new pg.Pool({
    connectionString,
    // Fail fast instead of hanging forever on an unreachable database.
    connectionTimeoutMillis: 10_000,
    max: 10,
  });
  return drizzle(pool);
}

/**
 * Get the process-wide database client. Throws a clear, value-free error in
 * environments where `DATABASE_URL` is unset (development without a real
 * database; tests use their own doubles and never call this).
 */
export function getDb(): Database {
  if (cachedDb) {
    return cachedDb;
  }
  const env = getEnv();
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured in this environment (value never printed); see .env.example and ADR-0007.",
    );
  }
  cachedDb = createDb(env.DATABASE_URL);
  return cachedDb;
}
