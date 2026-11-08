import "server-only";

import {
  createProfileReadLimiter,
  getProfileService,
} from "@/modules/profile/provider";
import { normalizeUsername, usernameInputSchema } from "@synergy/domain";
import type { ProfileService } from "@/modules/profile/service";
import { badRequest } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { SessionSource } from "@/server/auth/session";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `GET /api/v1/profile/username-availability?username=…`
 *
 * Advisory only. It exists so onboarding can say "that handle is taken" before
 * the member submits; the UNIQUE index remains the authority, and a request that
 * loses the race still gets a 409 on write.
 *
 * The answer never includes anything about the existing owner — only whether the
 * normalised handle is free — and the input is normalised exactly as the write
 * path normalises it, so `Ada` and `ada` cannot disagree.
 */

export interface UsernameAvailabilityDeps {
  sessionSource: SessionSource;
  service: ProfileService;
  limiter?: RateLimiter;
}

export function createUsernameAvailabilityRoute(
  deps: UsernameAvailabilityDeps,
) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request }) => {
      const raw = new URL(request.url).searchParams.get("username") ?? "";
      const parsed = usernameInputSchema.safeParse(raw);
      if (!parsed.success) {
        throw badRequest(
          "Invalid input in: username (use 3–30 lowercase letters, numbers or underscores)",
        );
      }
      const result = await deps.service.checkUsername({
        username: normalizeUsername(raw),
      });
      return Response.json(result, {
        headers: { "cache-control": "no-store" },
      });
    },
  });
}

const moduleDeps: UsernameAvailabilityDeps = {
  sessionSource: getLazySessionSource(),
  get service(): ProfileService {
    return getProfileService();
  },
  limiter: createProfileReadLimiter(),
};

export const GET = createUsernameAvailabilityRoute(moduleDeps);
