import "server-only";

import { POST_MEDIA_MAX_BYTES } from "@synergy/domain";

import type { SessionSource } from "@/server/auth/session";
import { requireSameOrigin } from "@/server/auth/origin";
import { requireAuthenticatedUser } from "@/server/authz";
import { getEnv } from "@/server/env";
import { AppError, badRequest } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { isCloudinaryFolderUrl } from "@/server/media/cloudinary";
import {
  imageFolderForUser,
  uploadImageToCloudinary,
  validateImageFile,
  type CloudinaryConfig,
  type ValidatedImageFile,
} from "@/server/media/image-upload";
import { getLazySessionSource } from "@/server/provider-access";
import {
  createInMemoryRateLimiter,
  type RateLimiter,
} from "@/server/ratelimit";

/**
 * `POST /api/v1/posts/media-upload` — attach a photo to a post.
 *
 * Multipart body with a single `file` field. The verified session must have a
 * profile (otherwise there is nothing to attach the post to). The server:
 *
 * 1. requires same-origin (cookie CSRF),
 * 2. rate-limits the caller,
 * 3. validates the bytes (JPEG/PNG/WebP, ≤4 MB, pixel cap) by magic bytes,
 * 4. uploads to `synergy/posts/<opaque member folder>` with a server-side
 *    signature and a generated public_id,
 * 5. returns ONLY the verified `mediaUrl`.
 *
 * The post is created by the separate `POST /api/v1/posts` call, so removing a
 * photo or abandoning the composer never publishes anything. When Cloudinary
 * is not configured the endpoint answers 503 with the exact variable names;
 * text-only publishing still works.
 */

export type PostMediaUploader = (
  input: ValidatedImageFile & {
    userId: string;
    config: CloudinaryConfig;
  },
) => Promise<{ mediaUrl: string }>;

export interface PostMediaRouteDeps {
  sessionSource: SessionSource;
  uploader?: PostMediaUploader;
  limiter?: RateLimiter;
  readConfig?: () => CloudinaryConfig | null;
}

export const POST_MEDIA_LIMITS = {
  maxBytes: POST_MEDIA_MAX_BYTES,
  maxWidth: 8000,
  maxHeight: 8000,
} as const;

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

export const cloudinaryPostMediaUploader: PostMediaUploader = async (input) => {
  const folder = imageFolderForUser("posts", input.userId);
  const { secureUrl } = await uploadImageToCloudinary({
    validated: input,
    folder,
    publicIdPrefix: "post",
    config: input.config,
  });
  if (!isCloudinaryFolderUrl(secureUrl, input.config.cloudName, folder)) {
    throw new AppError(
      "internal_error",
      "The photo could not be uploaded. Please try again.",
    );
  }
  return { mediaUrl: secureUrl };
};

export function createPostMediaLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 10, windowSeconds: 60 });
}

export function createPostMediaUploadRoute(deps: PostMediaRouteDeps) {
  const uploader = deps.uploader ?? cloudinaryPostMediaUploader;
  const readConfig = deps.readConfig ?? readCloudinaryConfig;

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
                "Post photos are not configured yet. The owner must set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and MEDIA_PROVIDER_ADAPTER=cloudinary in the Preview environment. You can still publish a text-only post.",
            },
          },
          { status: 503, headers: { "cache-control": "no-store" } },
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

      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await fileEntry.arrayBuffer());
      } catch {
        throw badRequest("The photo could not be read.");
      }

      const validated = validateImageFile(
        {
          bytes,
          declaredType: fileEntry.type || undefined,
          filename:
            "name" in fileEntry && typeof fileEntry.name === "string"
              ? fileEntry.name
              : undefined,
        },
        POST_MEDIA_LIMITS,
      );

      let uploaded: { mediaUrl: string };
      try {
        uploaded = await uploader({
          ...validated,
          userId: user.userId,
          config,
        });
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          "internal_error",
          "The photo could not be uploaded. Please try again.",
        );
      }

      return Response.json(
        { mediaUrl: uploaded.mediaUrl },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

const moduleDeps: PostMediaRouteDeps = {
  sessionSource: getLazySessionSource(),
  limiter: createPostMediaLimiter(),
};

export const POST = createPostMediaUploadRoute(moduleDeps);
