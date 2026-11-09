import "server-only";

import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

import {
  createFeedReadLimiter,
  getPostsService,
} from "@/modules/posts/provider";
import type { PostsService } from "@/modules/posts/service";

/**
 * `GET /api/v1/feed?limit=&cursor=`
 *
 * The newest-first feed of public posts plus the caller's own posts. Anonymous
 * callers are welcome; the verified session only personalises ownership and
 * like state. Visibility is enforced in the SQL query — a private profile's
 * posts are never selected for anyone else — and the response is `no-store`
 * because it is per-viewer data.
 */

export interface FeedRouteDeps {
  sessionSource: SessionSource;
  service: PostsService;
  limiter?: RateLimiter;
}

export function createFeedRoute(deps: FeedRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      const url = new URL(request.url);
      const page = await deps.service.getFeed(session, {
        limit: url.searchParams.get("limit"),
        cursor: url.searchParams.get("cursor"),
      });
      return Response.json(page, {
        headers: { "cache-control": "no-store" },
      });
    },
  });
}

const moduleDeps: FeedRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): PostsService {
    return getPostsService();
  },
  limiter: createFeedReadLimiter(),
};

export const GET = createFeedRoute(moduleDeps);
