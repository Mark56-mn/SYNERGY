import "server-only";

import { getDb } from "@/server/db/client";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";

import { createDrizzlePostRepository } from "./repository";
import { createPostsService, type PostsService } from "./service";

/**
 * Composition root for the publishing module. Lazy for the same reason as the
 * profile module: importing a page or route must not open a connection, so
 * `next build` and the test suite stay credential-free.
 */

let cachedService: PostsService | null = null;

export function getPostsService(): PostsService {
  cachedService ??= createPostsService(createDrizzlePostRepository(getDb()));
  return cachedService;
}

/** Feed reads are cheap and anonymous-safe; bound them per caller/peer. */
export function createFeedReadLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 120, windowSeconds: 60 });
}

/** Publishing is a write: tighter than reading. */
export function createPostWriteLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 10, windowSeconds: 60 });
}

/** Like/unlike toggles are frequent but must still be bounded. */
export function createPostLikeLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 60, windowSeconds: 60 });
}
