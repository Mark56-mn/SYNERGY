import "server-only";

import type { AuthGateway } from "@/server/auth/auth-gateway";
import {
  appendSetCookies,
  buildClearCookies,
  requestIsSecure,
} from "@/server/auth/cookies";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { logger } from "@/server/logging";
import { createApiRoute } from "@/server/http/handler";
import {
  getLazyAuthGateway,
  getLazySessionSource,
  isSupabaseAuthConfigured,
  readRequestAccessToken,
} from "@/server/provider-access";

export interface LogoutRouteDeps {
  gateway: AuthGateway;
  sessionSource: SessionSource;
}

/**
 * Logout. The application's session is ALWAYS cleared (cookies expired) so
 * the user is signed out in this app no matter what. Provider-side
 * revocation is best-effort: if the provider call fails, the failure is
 * recorded in the server log (names only, no token) but the local sign-out
 * still succeeds — trapping a user in a signed-in state because of a
 * provider outage would be the worse failure.
 */
export function createLogoutRoute(deps: LogoutRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    handler: async ({ request }) => {
      requireSameOrigin(request);
      if (isSupabaseAuthConfigured()) {
        const token = readRequestAccessToken(request);
        if (token) {
          try {
            await deps.gateway.signOut(token);
          } catch {
            logger.warn("provider sign-out did not complete", {
              path: "/api/v1/auth/logout",
            });
          }
        }
      }
      const headers = new Headers({
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      appendSetCookies(headers, buildClearCookies(requestIsSecure(request)));
      return new Response(JSON.stringify({ ok: true }), { headers });
    },
  });
}

export const POST = createLogoutRoute({
  gateway: getLazyAuthGateway(),
  sessionSource: getLazySessionSource(),
});
