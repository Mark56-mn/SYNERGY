import "server-only";

import { profileOnboardingSchema } from "@synergy/domain";

import {
  createProfileWriteLimiter,
  getProfileService,
} from "@/modules/profile/provider";
import {
  toOwnerProfileDto,
  type ProfileService,
} from "@/modules/profile/service";
import { requireSameOrigin } from "@/server/auth/origin";
import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";
import { getEnv } from "@/server/env";
import {
  canonicalizeSupabaseAvatarReference,
  deleteSupabaseMediaAvatar,
  isSupabaseMediaReference,
  type SupabaseMediaConfig,
} from "@/modules/profile/avatar-upload";

export interface OnboardingRouteDeps {
  sessionSource: SessionSource;
  service: ProfileService;
  limiter?: RateLimiter;
  readConfig?: () => SupabaseMediaConfig | null;
  mediaConfig?: SupabaseMediaConfig | null;
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
  cleanupAvatar?: (
    config: SupabaseMediaConfig,
    objectPath: string,
    userId: string,
  ) => Promise<void>;
}

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

export function createOnboardingRoute(deps: OnboardingRouteDeps) {
  const readConfig =
    deps.readConfig ??
    (() =>
      deps.mediaConfig === undefined
        ? readSupabaseMediaConfig()
        : deps.mediaConfig);
  const deleteImpl =
    deps.deleteObject ??
    deps.deleter ??
    deps.deleteFn ??
    deps.deleteAvatar ??
    deps.cleanupAvatar ??
    deleteSupabaseMediaAvatar;

  return createApiRoute({
    sessionSource: deps.sessionSource,
    inputSchema: profileOnboardingSchema,
    limiter: deps.limiter,
    handler: async ({ request, session, body }) => {
      requireSameOrigin(request);
      const pending =
        typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : null;

      try {
        const { profile, created } = await deps.service.completeOnboarding(
          session,
          body!,
        );
        return Response.json(
          { profile: toOwnerProfileDto(profile), created },
          {
            status: created ? 201 : 200,
            headers: { "cache-control": "no-store" },
          },
        );
      } catch (error) {
        // Best-effort cleanup of a newly uploaded avatar when onboarding fails.
        // The original error is always rethrown.
        const userId = session?.userId;
        const config = readConfig();
        if (pending && userId && config) {
          const pendingPath = canonicalizeSupabaseAvatarReference(
            pending,
            config.url,
            config.bucket,
          );
          if (
            pendingPath &&
            isSupabaseMediaReference(pendingPath) &&
            pendingPath.split("/")[0] === userId
          ) {
            try {
              await deleteImpl(config, pendingPath, userId);
            } catch {
              // Best-effort cleanup only.
            }
          }
        }
        throw error;
      }
    },
  });
}

const moduleDeps: OnboardingRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): ProfileService {
    return getProfileService();
  },
  limiter: createProfileWriteLimiter(),
};

export const POST = createOnboardingRoute(moduleDeps);
