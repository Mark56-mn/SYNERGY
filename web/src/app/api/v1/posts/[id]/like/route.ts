import "server-only";

import {
  createPostLikeLimiter,
  getPostsService,
} from "@/modules/posts/provider";
import type { PostsService } from "@/modules/posts/service";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `POST /api/v1/posts/[id]/like` (like) and `DELETE` (unlike).
 *
 * Likes are real persistence: `post_likes` has a composite primary key, so a
 * retried request cannot double-count. Signing out leaves the UI offering
 * sign-in instead of a like that silently does nothing.
 */

export interface PostLikeRouteDeps {
  sessionSource: SessionSource;
  service: PostsService;
  limiter?: RateLimiter;
}

export function createPostLikeRoute(deps: PostLikeRouteDeps, liked: boolean) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session, params }) => {
      requireSameOrigin(request);
      const result = await deps.service.setLike(
        session,
        params.id ?? "",
        liked,
      );
      return Response.json(result, {
        headers: { "cache-control": "no-store" },
      });
    },
  });
}

const moduleDeps: PostLikeRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): PostsService {
    return getPostsService();
  },
  limiter: createPostLikeLimiter(),
};

export const POST = createPostLikeRoute(moduleDeps, true);
export const DELETE = createPostLikeRoute(moduleDeps, false);
