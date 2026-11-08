import "server-only";

import { z } from "zod";

import type { AuthGateway } from "@/server/auth/auth-gateway";
import {
  appendSetCookies,
  buildAuthSetCookies,
  requestIsSecure,
} from "@/server/auth/cookies";
import { rejectCrossOriginIfPresent } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { AppError, statusForCode, toErrorBody } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import {
  createAuthRateLimiter,
  getLazyAuthGateway,
  getLazySessionSource,
  isSupabaseAuthConfigured,
} from "@/server/provider-access";
import { getEnv } from "@/server/env";
import type { RateLimiter } from "@/server/ratelimit";

export interface RegisterRouteDeps {
  gateway: AuthGateway;
  sessionSource: SessionSource;
  limiter?: RateLimiter;
}

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(256),
});

function badRequest(message: string): Response {
  return new Response(
    JSON.stringify(toErrorBody(new AppError("bad_request", message))),
    {
      status: statusForCode("bad_request"),
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export function createRegisterRoute(deps: RegisterRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    inputSchema: registerSchema,
    handler: async ({ request, body }) => {
      rejectCrossOriginIfPresent(request);
      if (!isSupabaseAuthConfigured()) {
        throw new AppError(
          "internal_error",
          "Authentication is not configured in this environment.",
        );
      }
      const redirectTo = `${getEnv().APP_ORIGIN.replace(/\/$/, "")}/auth/callback`;
      const result = await deps.gateway.signUp(
        body!.email,
        body!.password,
        redirectTo,
      );
      if (!result.ok) {
        // Generic on purpose: the response must not reveal whether the
        // email is already registered or which provider rule failed.
        return badRequest(
          "We couldn't create your account. Check your details and try again.",
        );
      }
      if (result.status === "confirmation-required") {
        // The account exists but is NOT authenticated: no cookies are set,
        // and the client must tell the user to confirm by email.
        return Response.json(
          { ok: true, status: "confirmation-required" },
          { headers: { "cache-control": "no-store" } },
        );
      }
      const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      appendSetCookies(
        headers,
        buildAuthSetCookies({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          accessMaxAgeSeconds: result.tokens.expiresIn,
          secure: requestIsSecure(request),
        }),
      );
      return new Response(JSON.stringify({ ok: true, status: "signed-in" }), {
        headers,
      });
    },
  });
}

export const POST = createRegisterRoute({
  gateway: getLazyAuthGateway(),
  sessionSource: getLazySessionSource(),
  limiter: createAuthRateLimiter(),
});
