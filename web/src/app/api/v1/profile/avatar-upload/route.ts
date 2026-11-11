import "server-only";

import type { SessionSource } from "@/server/auth/session";
import { requireAuthenticatedUser } from "@/server/authz";
import { requireSameOrigin } from "@/server/auth/origin";
import { AppError, badRequest } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";
import { getEnv } from "@/server/env";
import {
  supabaseMediaUploader,
  validateAvatarFile,
  type AvatarUploader,
  type SupabaseMediaConfig,
} from "@/modules/profile/avatar-upload";

export interface AvatarUploadRouteDeps {
  sessionSource: SessionSource;
  uploader?: AvatarUploader;
  limiter?: RateLimiter;
  readConfig?: () => SupabaseMediaConfig | null;
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

export function createAvatarUploadLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 10, windowSeconds: 60 });
}

export function createAvatarUploadRoute(deps: AvatarUploadRouteDeps) {
  const uploader = deps.uploader ?? supabaseMediaUploader;
  const readConfig = deps.readConfig ?? readSupabaseMediaConfig;

  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      requireSameOrigin(request);

      const user = requireAuthenticatedUser(session);

      const config = readConfig();
      if (!config) {
        return Response.json(
          {
            error: {
              code: "service_unavailable",
              message:
                "Photo uploads are not configured yet. The owner must add SUPABASE_MEDIA_URL and SUPABASE_MEDIA_SECRET_KEY to the environment.",
            },
          },
          {
            status: 503,
            headers: { "cache-control": "no-store" },
          },
        );
      }

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw badRequest("Expected a multipart/form-data request body.");
      }

      const fileEntry = form.get("file");
      if (!fileEntry || !(fileEntry instanceof Blob)) {
        throw badRequest("A photo file is required (field: file).");
      }

      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await fileEntry.arrayBuffer();
      } catch {
        throw badRequest("The photo could not be read.");
      }

      const fileName =
        "name" in fileEntry && typeof fileEntry.name === "string"
          ? fileEntry.name
          : undefined;

      const validated = validateAvatarFile({
        bytes: new Uint8Array(arrayBuffer),
        declaredType: fileEntry.type || undefined,
        filename: fileName,
      });

      const previousAvatarUrl =
        typeof form.get("previousAvatarUrl") === "string"
          ? (form.get("previousAvatarUrl") as string)
          : null;

      let uploaded;
      try {
        uploaded = await uploader({
          ...validated,
          userId: user.userId,
          config,
          previousAvatarUrl,
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError(
          "internal_error",
          "The photo could not be uploaded. Please try again.",
        );
      }

      return Response.json(
        { avatarUrl: uploaded.avatarUrl },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

const moduleDeps: AvatarUploadRouteDeps = {
  sessionSource: getLazySessionSource(),
  limiter: createAvatarUploadLimiter(),
};

export const POST = createAvatarUploadRoute(moduleDeps);
