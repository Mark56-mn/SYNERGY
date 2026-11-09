import "server-only";

import { postCreateSchema } from "@synergy/domain";

import {
  createPostWriteLimiter,
  getPostsService,
} from "@/modules/posts/provider";
import type { PostsService } from "@/modules/posts/service";
import type { SessionSource } from "@/server/auth/session";
import { requireSameOrigin } from "@/server/auth/origin";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `POST /api/v1/posts` — publish a caption plus an optional photo.
 *
 * The author is the verified session subject (never a body field; the schema is
 * strict), publishing requires a profile, and the same-origin check covers the
 * cookie CSRF shape. A signed-out caller receives 401 and nothing is written.
 */

export interface PostsRouteDeps {
  sessionSource: SessionSource;
  service: PostsService;
  limiter?: RateLimiter;
}

export function createCreatePostRoute(deps: PostsRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    inputSchema: postCreateSchema,
    limiter: deps.limiter,
    handler: async ({ request, session, body }) => {
      requireSameOrigin(request);
      const post = await deps.service.createPost(session, body!);
      return Response.json({ post }, { status: 201 });
    },
  });
}

const moduleDeps: PostsRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): PostsService {
    return getPostsService();
  },
  limiter: createPostWriteLimiter(),
};

export const POST = createCreatePostRoute(moduleDeps);
