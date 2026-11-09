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
  getSupabaseAuthConfigStatus,
} from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";
import { safeNextPath } from "@/lib/safe-redirect";

export interface LoginRouteDeps {
  gateway: AuthGateway;
  sessionSource: SessionSource;
  limiter?: RateLimiter;
}

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(256),
  next: z.string().max(2048).optional(),
});

function unauthorized(message: string): Response {
  return new Response(
    JSON.stringify(toErrorBody(new AppError("unauthorized", message))),
    {
      status: statusForCode("unauthorized"),
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export function createLoginRoute(deps: LoginRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    inputSchema: loginSchema,
    handler: async ({ request, body }) => {
      rejectCrossOriginIfPresent(request);
      const authConfig = getSupabaseAuthConfigStatus();
      if (!authConfig.configured) {
        // This log intentionally contains booleans and the environment name
        // only. Never log either credential or any portion of its value.
        console.error("[auth] Supabase credentials unavailable in runtime", {
          appEnv: authConfig.appEnv,
          authUrlPresent: authConfig.authUrlPresent,
          authAnonKeyPresent: authConfig.authAnonKeyPresent,
        });
        throw new AppError(
          "internal_error",
          "Authentication is not configured in this environment.",
        );
      }
      const result = await deps.gateway.signIn(body!.email, body!.password);
      if (!result.ok) {
        // One generic message for every failure mode (unknown email, wrong
        // password, unconfirmed account, provider outage): revealing which
        // one happened is an enumeration aid, not a useful product fact.
        return unauthorized("Invalid email or password.");
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
      return new Response(
        JSON.stringify({ ok: true, next: safeNextPath(body!.next) }),
        { headers },
      );
    },
  });
}

export const POST = createLoginRoute({
  gateway: getLazyAuthGateway(),
  sessionSource: getLazySessionSource(),
  limiter: createAuthRateLimiter(),
});
