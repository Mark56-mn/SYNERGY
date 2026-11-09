import "server-only";

import { z } from "zod";

/**
 * Centralised environment validation (ADR-0007).
 *
 * - One place parses configuration; nothing else in the app reads
 *   `process.env` directly.
 * - Required-ness is environment-aware (ADR-0007): development runs with
 *   stubs and no providers; staging/production fail fast without the
 *   variables they need; the Cloudinary trio is required only when the
 *   cloudinary adapter is selected.
 * - Failure messages list MISSING VARIABLE NAMES only — values are never
 *   printed, not even a redacted echo.
 * - Env is read lazily via `getEnv()` (never at module import), so `next
 *   build` and the test suite never need credentials.
 */

const envSchema = z.object({
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_AUTH_URL: z.url().optional(),
  SUPABASE_AUTH_ANON_KEY: z.string().min(1).optional(),
  // Vercel can supply an explicitly empty optional variable. Treat blank as
  // unset so the documented development/stub default remains deterministic.
  MEDIA_PROVIDER_ADAPTER: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.enum(["stub", "cloudinary"]).default("stub"),
  ),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RATE_LIMIT_MAX_PER_WINDOW: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .default(60),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(86_400)
    .default(60),
});

export type AppEnv = z.infer<typeof envSchema>;

const requiredOutsideDevelopment = [
  "APP_ORIGIN",
  "DATABASE_URL",
  "SUPABASE_AUTH_URL",
  "SUPABASE_AUTH_ANON_KEY",
] as const;

const cloudinaryFields = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

export class EnvValidationError extends Error {}

function missingOf(names: readonly string[]): string[] {
  return names.filter((n) => {
    const v = process.env[n];
    return v === undefined || v.trim() === "";
  });
}

let cached: AppEnv | null = null;

/**
 * Read and validate the application environment; throws
 * `EnvValidationError` with variable NAMES only. Call from request/runtime
 * paths, not at module top level.
 */
export function getEnv(): AppEnv {
  if (cached) {
    return cached;
  }

  const isDev = (process.env.APP_ENV ?? "development") === "development";

  if (!isDev) {
    const missing = missingOf(requiredOutsideDevelopment);
    if (missing.length > 0) {
      throw new EnvValidationError(
        `missing required environment variables for this environment: ${missing.join(", ")} (names only; values are never printed)`,
      );
    }
  }

  const adapter = process.env.MEDIA_PROVIDER_ADAPTER?.trim() || "stub";
  if (adapter === "cloudinary") {
    const missing = missingOf(cloudinaryFields);
    if (missing.length > 0) {
      throw new EnvValidationError(
        `missing required environment variables for the cloudinary adapter: ${missing.join(", ")} (names only; values are never printed)`,
      );
    }
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
    ].filter(Boolean);
    throw new EnvValidationError(
      `environment validation failed for: ${fields.join(", ") || "unknown variables"} (names only)`,
    );
  }

  if (isDev && !process.env.DATABASE_URL?.trim()) {
    parsed.data.DATABASE_URL = undefined as unknown as string;
  }

  cached = parsed.data;
  return cached;
}

/** Test hook: drop the cached env so a test can set fresh variables. */
export function resetEnvCacheForTests(): void {
  cached = null;
}
