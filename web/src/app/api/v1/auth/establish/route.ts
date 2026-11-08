import "server-only";

import { z } from "zod";

import type { AuthGateway } from "@/server/auth/auth-gateway";
import {
  appendSetCookies,
  buildAccessOnlyCookie,
  buildAuthSetCookies,
  requestIsSecure,
} from "@/server/auth/cookies";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { AppError, statusForCode, toErrorBody } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import {
  createAuthRateLimiter,
  getLazyAuthGateway,
  getLazySessionSource,
  isSupabaseAuthConfigured,
} from "@/server/provider-access";
import type { TokenVerifier } from "@/server/auth/supabase-session";
import { createSupabaseTokenVerifier } from "@/server/auth/supabase-session";
import { getEnv } from "@/server/env";
import type { RateLimiter } from "@/server/ratelimit";

export interface EstablishRouteDeps {
  gateway: AuthGateway;
  verifier: TokenVerifier;
  sessionSource: SessionSource;
  limiter?: RateLimiter;
}

const establishSchema = z.object({
  accessToken: z.string().min(1).max(8192),
  refreshToken: z.string().min(1).max(8192).optional(),
  expiresIn: z.number().int().min(1).max(86_400).optional(),
});

/**
 * Convert a provider session that arrived in a URL fragment (email
 * confirmation / recovery links) into HttpOnly cookies. The access token is
 * verified against the provider FIRST; only a verified token becomes a
 * cookie. The client's suggested `expiresIn` only sizes the cookie — it is
 * clamped, and whenever a refresh token is present the provider's own
 * numbers win (via the refresh call).
 */
export function createEstablishRoute(deps: EstablishRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    inputSchema: establishSchema,
    handler: async ({ request, body }) => {
      requireSameOrigin(request);
      if (!isSupabaseAuthConfigured()) {
        throw new AppError(
          "internal_error",
          "Authentication is not configured in this environment.",
        );
      }
      const identity = await deps.verifier.verify(body!.accessToken);
      if (!identity) {
        return new Response(
          JSON.stringify(
            toErrorBody(
              new AppError(
                "unauthorized",
                "This link has expired or is invalid. Request a new one.",
              ),
            ),
          ),
          {
            status: statusForCode("unauthorized"),
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      }

      const secure = requestIsSecure(request);
      const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });

      if (body!.refreshToken) {
        const fresh = await deps.gateway.refresh(body!.refreshToken);
        if (fresh) {
          appendSetCookies(
            headers,
            buildAuthSetCookies({
              accessToken: fresh.accessToken,
              refreshToken: fresh.refreshToken,
              accessMaxAgeSeconds: fresh.expiresIn,
              secure,
            }),
          );
          return new Response(JSON.stringify({ ok: true }), { headers });
        }
        // Refresh token rejected: fall through to the access-token cookie
        // (still provider-verified above), so the user is not left stranded.
      }

      appendSetCookies(
        headers,
        buildAccessOnlyCookie({
          accessToken: body!.accessToken,
          accessMaxAgeSeconds: body!.expiresIn ?? 3600,
          secure,
        }),
      );
      return new Response(JSON.stringify({ ok: true }), { headers });
    },
  });
}

function lazyVerifier(): TokenVerifier {
  let cached: TokenVerifier | null = null;
  return {
    async verify(token: string) {
      cached ??= createSupabaseTokenVerifier({
        url: getEnv().SUPABASE_AUTH_URL!,
        anonKey: getEnv().SUPABASE_AUTH_ANON_KEY!,
      });
      return cached.verify(token);
    },
  };
}

export const POST = createEstablishRoute({
  gateway: getLazyAuthGateway(),
  verifier: lazyVerifier(),
  sessionSource: getLazySessionSource(),
  limiter: createAuthRateLimiter(),
});
