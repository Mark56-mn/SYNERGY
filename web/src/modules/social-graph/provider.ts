import "server-only";

import { getDb } from "@/server/db/client";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";

import { createDrizzleSocialGraphRepository } from "./repository";
import { createSocialGraphService, type SocialGraphService } from "./service";

/**
 * Composition root for the social-graph module. Lazy for the same reason as the
 * profile/posts providers: importing a page or route must not open a database
 * connection, so `next build` and the test suite stay credential-free.
 */

let cachedService: SocialGraphService | null = null;

export function getSocialGraphService(): SocialGraphService {
  cachedService ??= createSocialGraphService(
    createDrizzleSocialGraphRepository(getDb()),
  );
  return cachedService;
}

/**
 * Follow writes are bounded per actor. In-memory and per-process, like every
 * limiter in this foundation — the boundary module documents that honestly.
 */
export function createFollowWriteLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 30, windowSeconds: 60 });
}
