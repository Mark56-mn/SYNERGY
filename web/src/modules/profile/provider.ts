import "server-only";

import { getDb } from "@/server/db/client";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";

import { createDrizzleProfileRepository } from "./repository";
import { createProfileService, type ProfileService } from "./service";

/**
 * Composition root for the profile module.
 *
 * Both dependencies are lazy by design: importing a route, a server component
 * or a page must never open a database connection, so `next build` and the test
 * suite stay credential-free. The first real request constructs the service.
 */

let cachedService: ProfileService | null = null;

export function getProfileService(): ProfileService {
  cachedService ??= createProfileService(
    createDrizzleProfileRepository(getDb()),
  );
  return cachedService;
}

/** Read limiter for profile lookups (availability checks, public reads). */
export function createProfileReadLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 60, windowSeconds: 60 });
}

/**
 * Write limiter for onboarding/edits. Tighter than the read bound because the
 * spec requires rate limiting on profile mutations and username checks.
 * In-memory and per-process, like every limiter in this foundation — the
 * boundary module documents that honestly.
 */
export function createProfileWriteLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 20, windowSeconds: 60 });
}
