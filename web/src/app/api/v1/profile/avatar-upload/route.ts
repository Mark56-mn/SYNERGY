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
  cloudinaryAvatarUploader,
  validateAvatarFile,
  type CloudinaryConfig,
  type CloudinaryUploader,
} from "@/modules/profile/avatar-upload";

/**
 * `POST /api/v1/profile/avatar-upload` — upload a profile photo.
 *
 * Multipart body with a single `file` field. The server:
 *
 * 1. resolves the verified session (never trusts a browser-supplied owner),
 * 2. requires the same origin (cookie CSRF defence),
 * 3. rate-limits the caller,
 * 4. sniffs and validates the bytes (JPEG / PNG / WebP, ≤4 MB, ≤8000px),
 * 5. uploads to Cloudinary with a server-side signature over the fixed,
 *    allowlisted parameter set (fixed folder per member, generated
 *    public_id — the browser chooses neither),
 * 6. returns only the verified `avatarUrl`. The profile row is changed by
 *    the subsequent `PATCH /api/v1/profile` save, so a failed upload never
 *    overwrites a previously saved photo.
 *
 * When Cloudinary is not configured (`MEDIA_PROVIDER_ADAPTER` is not
 * `cloudinary`, or any of the three server-only variables is missing) the
 * endpoint answers 503 with a configuration message naming the required
 * Preview variables. It never falls back to a third-party host or a data
 * URL, and it never pretends to succeed.
 */

export interface AvatarUploadRouteDeps {
  sessionSource: SessionSource;
  uploader?: CloudinaryUploader;
  limiter?: RateLimiter;
  readConfig?: () => CloudinaryConfig | null;
}

function readCloudinaryConfig(): CloudinaryConfig | null {
  try {
    const env = getEnv();
    if (env.MEDIA_PROVIDER_ADAPTER !== "cloudinary") return null;
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET
    ) {
      return null;
    }
    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    };
  } catch {
    return null;
  }
}

export function createAvatarUploadLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 10, windowSeconds: 60 });
}

export function createAvatarUploadRoute(deps: AvatarUploadRouteDeps) {
  const uploader = deps.uploader ?? cloudinaryAvatarUploader;
  const readConfig = deps.readConfig ?? readCloudinaryConfig;

  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      // Cookie sessions are ambient authority: require our own origin.
      requireSameOrigin(request);

      const user = requireAuthenticatedUser(session);

      const config = readConfig();
      if (!config) {
        return Response.json(
          {
            error: {
              code: "service_unavailable",
              message:
                "Photo uploads are not configured yet. The owner must add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the Vercel Preview environment.",
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

      let uploaded;
      try {
        uploaded = await uploader({
          ...validated,
          userId: user.userId,
          config,
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
