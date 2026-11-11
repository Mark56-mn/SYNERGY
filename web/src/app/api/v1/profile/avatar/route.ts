import "server-only";

import type { SessionSource } from "@/server/auth/session";
import { getProfileService } from "@/modules/profile/provider";
import { createSignedAvatarUrl } from "@/modules/profile/avatar-upload";
import {
  createAvatarCleanupRoute,
  createAvatarDeleteRoute,
  createPendingAvatarCleanupRoute,
  createUncommittedAvatarCleanupRoute,
} from "../avatar-cleanup/route";
import { isSupabaseMediaReference } from "@/modules/profile/avatar-upload";
import { getEnv } from "@/server/env";
import { getLazySessionSource } from "@/server/provider-access";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";
import { createApiRoute } from "@/server/http/handler";
import { badRequest, notFound, serviceUnavailable } from "@/server/http/errors";

export interface AvatarDisplayRouteDeps {
  sessionSource: SessionSource;
  limiter?: RateLimiter;
}

function readMediaConfig() {
  try {
    const env = getEnv();
    if (!env.SUPABASE_MEDIA_URL || !env.SUPABASE_MEDIA_SECRET_KEY) return null;
    return {
      url: env.SUPABASE_MEDIA_URL,
      secretKey: env.SUPABASE_MEDIA_SECRET_KEY,
      bucket: env.SUPABASE_MEDIA_BUCKET ?? "profile-photos",
    };
  } catch {
    return null;
  }
}

export function createAvatarDisplayRoute(deps: AvatarDisplayRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      const config = readMediaConfig();
      if (!config) {
        throw serviceUnavailable(
          "Avatar display is not configured yet. The owner must add SUPABASE_MEDIA_URL and SUPABASE_MEDIA_SECRET_KEY.",
        );
      }

      const path = new URL(request.url).searchParams.get("path");
      if (!path || !isSupabaseMediaReference(path)) {
        throw badRequest("A valid avatar reference is required.");
      }

      const ownerSegment = path.split("/")[0]!;
      const isOwner = session?.userId === ownerSegment;

      if (!isOwner) {
        const service = getProfileService();
        const visibility = await service.getProfileVisibility(ownerSegment);
        if (visibility !== "public") {
          throw notFound("Profile photo not found.");
        }
      }

      const signedUrl = await createSignedAvatarUrl(config, path, 300);

      const wantsJson =
        request.headers.get("accept")?.includes("application/json") ||
        new URL(request.url).searchParams.get("format") === "json";

      if (wantsJson) {
        return Response.json(
          { url: signedUrl },
          { headers: { "cache-control": "no-store" } },
        );
      }

      return Response.redirect(signedUrl, 302);
    },
  });
}

const moduleDeps: AvatarDisplayRouteDeps = {
  sessionSource: getLazySessionSource(),
  limiter: createInMemoryRateLimiter({ maxPerWindow: 60, windowSeconds: 60 }),
};

export const GET = createAvatarDisplayRoute(moduleDeps);

const cleanupModuleDeps = {
  sessionSource: getLazySessionSource(),
  limiter: createInMemoryRateLimiter({ maxPerWindow: 20, windowSeconds: 60 }),
};

export const DELETE = createAvatarCleanupRoute(cleanupModuleDeps);

// Re-export cleanup factories for compatibility with either import path.
export {
  createAvatarCleanupRoute,
  createAvatarDeleteRoute,
  createPendingAvatarCleanupRoute,
  createUncommittedAvatarCleanupRoute,
};
