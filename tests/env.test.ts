import { beforeEach, describe, expect, it } from "vitest";

import {
  EnvValidationError,
  getEnv,
  resetEnvCacheForTests,
} from "@/server/env";

/** Every variable the schema knows about — fully cleared before each test. */
const MANAGED_VARS = [
  "APP_ENV",
  "APP_ORIGIN",
  "DATABASE_URL",
  "SUPABASE_AUTH_URL",
  "SUPABASE_AUTH_ANON_KEY",
  "MEDIA_PROVIDER_ADAPTER",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "LOG_LEVEL",
  "RATE_LIMIT_MAX_PER_WINDOW",
  "RATE_LIMIT_WINDOW_SECONDS",
] as const;

const DEV_DEFAULTS: Record<string, string> = {
  APP_ENV: "development",
  APP_ORIGIN: "http://localhost:3000",
  MEDIA_PROVIDER_ADAPTER: "stub",
  LOG_LEVEL: "info",
};

function applyEnv(map: Record<string, string | undefined>): void {
  for (const key of MANAGED_VARS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

describe("server env validation (ADR-0007)", () => {
  beforeEach(() => {
    resetEnvCacheForTests();
    applyEnv({ ...DEV_DEFAULTS });
  });

  it("development succeeds without DATABASE_URL or provider credentials", () => {
    const env = getEnv();
    expect(env.APP_ENV).toBe("development");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.MEDIA_PROVIDER_ADAPTER).toBe("stub");
  });

  it("staging/production fail fast without a database URL, listing the name only", () => {
    applyEnv({
      ...DEV_DEFAULTS,
      APP_ENV: "production",
      SUPABASE_AUTH_URL: "https://identity.example.zone",
      SUPABASE_AUTH_ANON_KEY: "placeholder-accessor-not-a-real-key-01",
    });
    expect(() => getEnv()).toThrow(EnvValidationError);
    try {
      getEnv();
      expect.unreachable("expected EnvValidationError");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("DATABASE_URL");
      // Values are never printed, only names.
      expect(message).not.toContain("://");
      expect(message).not.toMatch(/placeholder-accessor/);
    }
  });

  it("cloudinary adapter without credentials fails with names only", () => {
    applyEnv({ ...DEV_DEFAULTS, MEDIA_PROVIDER_ADAPTER: "cloudinary" });
    try {
      getEnv();
      expect.unreachable("expected EnvValidationError");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("CLOUDINARY_API_KEY");
      expect(message).toContain("cloudinary adapter");
    }
  });

  it("invalid APP_ORIGIN is rejected by name", () => {
    applyEnv({ ...DEV_DEFAULTS, APP_ORIGIN: "not-a-url" });
    expect(() => getEnv()).toThrow(/APP_ORIGIN/);
  });

  it("a configured staging environment passes validation", () => {
    applyEnv({
      ...DEV_DEFAULTS,
      APP_ENV: "staging",      DATABASE_URL: "postgresql://db.staging.example:5432/synergy",
      SUPABASE_AUTH_URL: "https://identity.staging.example.zone",
      SUPABASE_AUTH_ANON_KEY: "placeholder-accessor-not-a-real-key-02",
    });
    const env = getEnv();
    expect(env.APP_ENV).toBe("staging");
    expect(env.DATABASE_URL).toContain("db.staging.example");
  });
});
