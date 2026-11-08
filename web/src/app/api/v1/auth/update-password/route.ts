import "server-only";

import { z } from "zod";

import type { AuthGateway } from "@/server/auth/auth-gateway";
import { requireSameOrigin } from "@/server/auth/origin";
import { requireAuthenticatedUser } from "@/server/authz";
import { AppError, statusForCode, toErrorBody } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import {
  getLazyAuthGateway,
  getLazySessionSource,
  isSupabaseAuthConfigured,
  readRequestAccessToken,
} from "@/server/provider-access";
import type { SessionSource } from "@/server/auth/session";

export interface UpdatePasswordRouteDeps {
  gateway: AuthGateway;
  sessionSource: SessionSource;
}

const updateSchema = z.object({
  password: z.string().min(8).max(256),
});

/**
 * Set a new password for the verified caller. Used by the recovery flow
 * (where the session was established from the recovery link) and would serve
 * any future "change password" surface the same way. The access token is
 * forwarded to the provider from the server-side request only — it never
 * appears in a response body.
 */
export function createUpdatePasswordRoute(deps: UpdatePasswordRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    inputSchema: updateSchema,
    handler: async ({ request, session, body }) => {
      requireSameOrigin(request);
      // Throws 401 when unauthenticated — an expired recovery link lands
      // here as "no session", which is the honest answer.
      requireAuthenticatedUser(session);
      if (!isSupabaseAuthConfigured()) {
        throw new AppError(
          "internal_error",
          "Authentication is not configured in this environment.",
        );
      }
      const token = readRequestAccessToken(request);
      if (!token) {
        throw new AppError(
          "internal_error",
          "Something went wrong. Please try again later.",
        );
      }
      const updated = await deps.gateway.updatePassword(token, body!.password);
      if (!updated) {
        return new Response(
          JSON.stringify(
            toErrorBody(
              new AppError(
                "bad_request",
                "We couldn't update your password. Make sure it is at least 8 characters and try again.",
              ),
            ),
          ),
          {
            status: statusForCode("bad_request"),
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      }
      return Response.json(
        { ok: true },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

export const POST = createUpdatePasswordRoute({
  gateway: getLazyAuthGateway(),
  sessionSource: getLazySessionSource(),
});
