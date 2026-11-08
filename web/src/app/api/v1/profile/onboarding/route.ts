import "server-only";

import { profileOnboardingSchema } from "@synergy/domain";

import {
  createProfileWriteLimiter,
  getProfileService,
} from "@/modules/profile/provider";
import {
  toOwnerProfileDto,
  type ProfileService,
} from "@/modules/profile/service";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `POST /api/v1/profile/onboarding` — create the member's profile once.
 *
 * Idempotent by contract: a retry, a double-submitted form or an interrupted
 * first attempt returns the existing profile with `created: false` and status
 * 200 instead of creating a duplicate or failing. The database UNIQUE index on
 * `identity_id` is what actually guarantees that under concurrency; this route
 * only reports it.
 */

export interface OnboardingRouteDeps {
  sessionSource: SessionSource;
  service: ProfileService;
  limiter?: RateLimiter;
}

export function createOnboardingRoute(deps: OnboardingRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    inputSchema: profileOnboardingSchema,
    limiter: deps.limiter,
    handler: async ({ request, session, body }) => {
      requireSameOrigin(request);
      const { profile, created } = await deps.service.completeOnboarding(
        session,
        body!,
      );
      return Response.json(
        { profile: toOwnerProfileDto(profile), created },
        {
          status: created ? 201 : 200,
          headers: { "cache-control": "no-store" },
        },
      );
    },
  });
}

const moduleDeps: OnboardingRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): ProfileService {
    return getProfileService();
  },
  limiter: createProfileWriteLimiter(),
};

export const POST = createOnboardingRoute(moduleDeps);
