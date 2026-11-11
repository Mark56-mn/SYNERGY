import "server-only";

import { profileUpdateSchema } from "@synergy/domain";

import {
  createProfileWriteLimiter,
  getProfileService,
} from "@/modules/profile/provider";
import {
  deleteSupabaseAvatarByUrl,
  isSupabaseAvatarUrl,
} from "@/modules/profile/avatar-upload";
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
 * `/api/v1/profile` — the authenticated member's own profile.
 *
 * - `GET` answers `{ profile: null }` when the account has no profile yet, which
 *   is how the client knows to send the member to onboarding. An unauthenticated
 *   caller is a 401 before any data access (deny by default).
 * - `PATCH` updates the caller's OWN profile. The identity comes from the
 *   verified session; the request schema is strict, so a body carrying
 *   `identityId`, `userId` or a role is rejected rather than applied.
 * - Both responses are `no-store`: a profile is per-viewer data and must never
 *   be cached by a shared proxy.
 */

export interface ProfileRouteDeps {
  sessionSource: SessionSource;
  service: ProfileService;
  limiter?: RateLimiter;
}

export function createGetProfileRoute(deps: ProfileRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    handler: async ({ session }) => {
      const profile = await deps.service.getOwnProfile(session);
      return Response.json(
        { profile: profile ? toOwnerProfileDto(profile) : null },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

export function createUpdateProfileRoute(deps: ProfileRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    inputSchema: profileUpdateSchema,
    limiter: deps.limiter,
    handler: async ({ request, session, body }) => {
      // Cookie sessions are ambient authority: a browser mutation must come
      // from our own origin (CSRF defence, SECURITY_RULES.md).
      requireSameOrigin(request);
      if (!session) {
        throw new (await import("@/server/http/errors")).AppError(
          "unauthorized",
          "Authentication required.",
        );
      }
      const previous = await deps.service.getOwnProfile(session);
      const profile = await deps.service.updateOwnProfile(session, body!);

      // Best-effort cleanup of a replaced/cleared Supabase avatar object.
      if (
        previous?.avatarUrl &&
        previous.avatarUrl !== profile.avatarUrl &&
        isSupabaseAvatarUrl(
          previous.avatarUrl,
          process.env.SUPABASE_AUTH_URL ?? "",
          process.env.SUPABASE_STORAGE_BUCKET ?? "avatars",
        )
      ) {
        try {
          const { getEnv } = await import("@/server/env");
          const env = getEnv();
          if (env.SUPABASE_AUTH_URL && env.SUPABASE_AUTH_ANON_KEY) {
            const { readRequestAccessToken } =
              await import("@/server/provider-access");
            await deleteSupabaseAvatarByUrl(
              previous.avatarUrl,
              session.userId,
              {
                url: env.SUPABASE_AUTH_URL,
                anonKey: env.SUPABASE_AUTH_ANON_KEY,
                bucket: env.SUPABASE_STORAGE_BUCKET ?? "avatars",
              },
              readRequestAccessToken(request),
            );
          }
        } catch {
          // Cleanup is best-effort; the profile update already succeeded.
        }
      }

      return Response.json(
        { profile: toOwnerProfileDto(profile) },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

const moduleDeps: ProfileRouteDeps = {
  sessionSource: getLazySessionSource(),
  // Getter: the service (and its database client) is built on first request,
  // never at module import, so builds and tests need no credentials.
  get service(): ProfileService {
    return getProfileService();
  },
  limiter: createProfileWriteLimiter(),
};

export const GET = createGetProfileRoute(moduleDeps);
export const PATCH = createUpdateProfileRoute(moduleDeps);
