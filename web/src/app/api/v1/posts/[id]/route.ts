import "server-only";

import {
  createPostWriteLimiter,
  getPostsService,
} from "@/modules/posts/provider";
import type { PostsService } from "@/modules/posts/service";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `DELETE /api/v1/posts/[id]` — soft-delete the caller's own post.
 *
 * The author comes from the verified session; a missing id, a deleted post and
 * another member's post all answer 404 so the endpoint is not an existence
 * oracle. The row and its likes/topics are retained (engagement history) but
 * every read path filters `deleted_at`.
 */

export interface PostItemRouteDeps {
  sessionSource: SessionSource;
  service: PostsService;
  limiter?: RateLimiter;
}

export function createDeletePostRoute(deps: PostItemRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session, params }) => {
      requireSameOrigin(request);
      await deps.service.deletePost(session, params.id ?? "");
      return Response.json({ ok: true }, { status: 200 });
    },
  });
}

const moduleDeps: PostItemRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): PostsService {
    return getPostsService();
  },
  limiter: createPostWriteLimiter(),
};

export const DELETE = createDeletePostRoute(moduleDeps);
