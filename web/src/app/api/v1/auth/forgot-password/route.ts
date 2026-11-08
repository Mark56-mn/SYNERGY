import "server-only";

import { z } from "zod";

import type { AuthGateway } from "@/server/auth/auth-gateway";
import { rejectCrossOriginIfPresent } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { getEnv } from "@/server/env";
import {
  createAuthRateLimiter,
  getLazyAuthGateway,
  getLazySessionSource,
  isSupabaseAuthConfigured,
} from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

export interface ForgotPasswordRouteDeps {
  gateway: AuthGateway;
  sessionSource: SessionSource;
  limiter?: RateLimiter;
}

const forgotSchema = z.object({
  email: z.email(),
});

/**
 * Password-recovery request. The response is IDENTICAL whether or not the
 * email belongs to a real account and whether or not the provider call
 * succeeded — enumeration resistance is the requirement, and documented
 * here so a future reader does not "improve" it into an oracle.
 */
export function createForgotPasswordRoute(deps: ForgotPasswordRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    inputSchema: forgotSchema,
    handler: async ({ request, body }) => {
      rejectCrossOriginIfPresent(request);
      if (!isSupabaseAuthConfigured()) {
        throw new AppError(
          "internal_error",
          "Authentication is not configured in this environment.",
        );
      }
      const redirectTo = `${getEnv().APP_ORIGIN.replace(/\/$/, "")}/reset-password`;
      await deps.gateway.requestPasswordRecovery(body!.email, redirectTo);
      return Response.json(
        {
          ok: true,
          message:
            "If an account exists for that email, a password reset link is on its way.",
        },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

export const POST = createForgotPasswordRoute({
  gateway: getLazyAuthGateway(),
  sessionSource: getLazySessionSource(),
  limiter: createAuthRateLimiter(),
});
