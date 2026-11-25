import "server-only";

import {
  createFollowWriteLimiter,
  getSocialGraphService,
} from "@/modules/social-graph/provider";
import type { SocialGraphService } from "@/modules/social-graph/service";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `POST /api/v1/profiles/[username]/follow` (follow)
 * `DELETE /api/v1/profiles/[username]/follow` (unfollow)
 *
 * Both are path-addressed and body-less on purpose: the actor is the verified
 * session and the target is resolved from the public handle, so a caller can
 * never name a follower or target id. Private and absent targets return the
 * same `404`, and both requests are idempotent.
 */

export interface FollowRouteDeps {
  sessionSource: SessionSource;
  service: SocialGraphService;
  limiter?: RateLimiter;
}

export function createFollowRoute(deps: FollowRouteDeps, following: boolean) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session, params }) => {
      requireSameOrigin(request);
      const username = params.username ?? "";
      const state = following
        ? await deps.service.follow(session, username)
        : await deps.service.unfollow(session, username);
      return Response.json(state, {
        headers: { "cache-control": "no-store" },
      });
    },
  });
}

const moduleDeps: FollowRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): SocialGraphService {
    return getSocialGraphService();
  },
  limiter: createFollowWriteLimiter(),
};

export const POST = createFollowRoute(moduleDeps, true);
export const DELETE = createFollowRoute(moduleDeps, false);
