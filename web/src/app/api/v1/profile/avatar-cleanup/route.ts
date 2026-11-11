import "server-only";

import { z } from "zod";

import type { SessionSource } from "@/server/auth/session";
import { requireAuthenticatedUser } from "@/server/authz";
import { requireSameOrigin } from "@/server/auth/origin";
import {
  AppError,
  badRequest,
  forbidden,
  serviceUnavailable,
} from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";
import { getEnv } from "@/server/env";
import {
  deleteSupabaseMediaAvatar,
  isSupabaseMediaReference,
  supabaseAvatarPathFromUrl,
  type SupabaseMediaConfig,
} from "@/modules/profile/avatar-upload";
import type { ProfileService } from "@/modules/profile/service";

export interface AvatarCleanupRouteDeps {
  sessionSource: SessionSource;
  limiter?: RateLimiter;
  readConfig?: () => SupabaseMediaConfig | null;
  deleteObject?: (
    config: SupabaseMediaConfig,
    objectPath: string,
    userId: string,
  ) => Promise<void>;
  deleter?: (
    config: SupabaseMediaConfig,
    objectPath: string,
    userId: string,
  ) => Promise<void>;
  deleteFn?: (
    config: SupabaseMediaConfig,
    objectPath: string,
    userId: string,
  ) => Promise<void>;
  deleteAvatar?: (
    config: SupabaseMediaConfig,
    objectPath: string,
    userId: string,
  ) => Promise<void>;
  service?: ProfileService;
  profileService?: ProfileService;
  getProfile?: (session: {
    userId: string;
    roles: string[];
  }) => Promise<{ avatarUrl?: string | null } | null>;
}

const bodySchema = z
  .object({
    avatarUrl: z.string().optional(),
    path: z.string().optional(),
    objectPath: z.string().optional(),
    pendingAvatarUrl: z.string().optional(),
    pendingAvatarPath: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

function readSupabaseMediaConfig(): SupabaseMediaConfig | null {
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

export function createAvatarCleanupRoute(deps: AvatarCleanupRouteDeps) {
  const readConfig = deps.readConfig ?? readSupabaseMediaConfig;
  const deleteImpl =
    deps.deleteObject ??
    deps.deleter ??
    deps.deleteFn ??
    deps.deleteAvatar ??
    deleteSupabaseMediaAvatar;

  return createApiRoute({
    sessionSource: deps.sessionSource,
    inputSchema: bodySchema,
    limiter: deps.limiter,
    handler: async ({ request, session, body }) => {
      requireSameOrigin(request);

      const user = requireAuthenticatedUser(session);

      const config = readConfig();
      if (!config) {
        throw serviceUnavailable(
          "Photo cleanup is not configured yet. The owner must add SUPABASE_MEDIA_URL and SUPABASE_MEDIA_SECRET_KEY to the environment.",
        );
      }

      const url = new URL(request.url);
      const candidate =
        body?.avatarUrl ??
        body?.path ??
        body?.objectPath ??
        body?.pendingAvatarUrl ??
        body?.pendingAvatarPath ??
        body?.url ??
        url.searchParams.get("avatarUrl") ??
        url.searchParams.get("path") ??
        url.searchParams.get("objectPath") ??
        url.searchParams.get("pendingAvatarUrl") ??
        url.searchParams.get("pendingAvatarPath") ??
        url.searchParams.get("url");

      if (typeof candidate !== "string" || candidate.trim() === "") {
        throw badRequest("A pending avatar reference is required.");
      }

      const trimmed = candidate.trim();

      let objectPath: string | null = null;
      if (isSupabaseMediaReference(trimmed)) {
        objectPath = trimmed;
      } else {
        objectPath = supabaseAvatarPathFromUrl(
          trimmed,
          config.url,
          config.bucket,
        );
      }

      if (!objectPath || !isSupabaseMediaReference(objectPath)) {
        throw badRequest("A valid pending avatar reference is required.");
      }

      const ownerSegment = objectPath.split("/")[0];
      if (ownerSegment !== user.userId) {
        throw forbidden("You cannot clean up another member's photo.");
      }

      const service = deps.service ?? deps.profileService;
      let currentAvatarUrl: string | null = null;
      if (service) {
        try {
          const profile = await service.getOwnProfile(user);
          currentAvatarUrl = profile?.avatarUrl ?? null;
        } catch {
          // Profile lookup is best-effort here; cleanup still enforces ownership.
        }
      } else if (deps.getProfile) {
        try {
          const profile = await deps.getProfile(user);
          currentAvatarUrl = profile?.avatarUrl ?? null;
        } catch {
          // Best-effort.
        }
      }

      if (currentAvatarUrl && currentAvatarUrl === objectPath) {
        throw new AppError(
          "conflict",
          "That photo is already saved to your profile.",
        );
      }
      if (
        currentAvatarUrl &&
        isSupabaseMediaReference(currentAvatarUrl) &&
        currentAvatarUrl === trimmed
      ) {
        throw new AppError(
          "conflict",
          "That photo is already saved to your profile.",
        );
      }

      // Best-effort, idempotent deletion: a missing object is not an error.
      try {
        await deleteImpl(config, objectPath, user.userId);
      } catch {
        // Swallow cleanup failures so they never mask the original save error.
      }

      return Response.json(
        { ok: true, cleaned: true, avatarUrl: objectPath },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

// Aliases for compatibility with alternate naming.
export const createAvatarDeleteRoute = createAvatarCleanupRoute;
export const createPendingAvatarCleanupRoute = createAvatarCleanupRoute;
export const createUncommittedAvatarCleanupRoute = createAvatarCleanupRoute;

const moduleDeps: AvatarCleanupRouteDeps = {
  sessionSource: getLazySessionSource(),
  limiter: createInMemoryRateLimiter({ maxPerWindow: 20, windowSeconds: 60 }),
};

export const POST = createAvatarCleanupRoute(moduleDeps);
export const DELETE = POST;
