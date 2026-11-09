import "server-only";

import type { DiscoverResultDto } from "@synergy/domain";

import {
  createDiscoverReadLimiter,
  getPostsService,
} from "@/modules/posts/provider";
import type { PostsService } from "@/modules/posts/service";
import type { SessionSource } from "@/server/auth/session";
import { badRequest } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `GET /api/v1/discover?q=&topic=`
 *
 * One read for the Discover surface: matching posts, public profiles and the
 * trending topics that drive the category filter.
 *
 * - Anonymous callers are welcome; the verified session only personalises
 *   ownership and like state.
 * - Visibility is enforced in SQL (public profile OR own post) and re-checked by
 *   the service, so a private author never appears in search results, creator
 *   suggestions or trending counts.
 * - Search text and the topic filter are bounded/validated before any query;
 *   `%`/`_` are escaped by the repository so user input cannot become a pattern.
 * - `no-store`: the payload contains per-viewer like/ownership state.
 */

export const DISCOVER_QUERY_MAX = 80;
const TOPIC_PATTERN = /^[a-z0-9_]{2,40}$/i;

/** Strict topic validation for the API; an invalid filter is a 400. */
export function normalizeDiscoverTopic(raw: string | null): string | null {
  if (raw === null) return null;
  const topic = raw.trim().toLowerCase();
  if (!TOPIC_PATTERN.test(topic)) {
    throw badRequest("Invalid topic filter.");
  }
  return topic;
}

export interface DiscoverRouteDeps {
  sessionSource: SessionSource;
  service: PostsService;
  limiter?: RateLimiter;
}

export function createDiscoverRoute(deps: DiscoverRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      const url = new URL(request.url);
      const query = (url.searchParams.get("q") ?? "")
        .trim()
        .slice(0, DISCOVER_QUERY_MAX);
      const topic = normalizeDiscoverTopic(url.searchParams.get("topic"));

      const [posts, creators, topics] = await Promise.all([
        deps.service.searchPosts(session, { query, topic, limit: 12 }),
        deps.service.getSuggestedCreators(session, { limit: 6, query }),
        deps.service.getTrendingTopics({ days: 30, limit: 8 }),
      ]);

      const result: DiscoverResultDto = {
        query,
        topic,
        posts,
        creators,
        topics,
      };
      return Response.json(result, {
        headers: { "cache-control": "no-store" },
      });
    },
  });
}

const moduleDeps: DiscoverRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): PostsService {
    return getPostsService();
  },
  limiter: createDiscoverReadLimiter(),
};

export const GET = createDiscoverRoute(moduleDeps);
