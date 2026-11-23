import "server-only";

import { POST_MEDIA_MAX_BYTES } from "@synergy/domain";

import type { SessionSource } from "@/server/auth/session";
import { requireSameOrigin } from "@/server/auth/origin";
import { requireAuthenticatedUser } from "@/server/authz";
import { getEnv } from "@/server/env";
import { AppError, badRequest, statusForCode } from "@/server/http/errors";
import { createApiRoute } from "@/server/http/handler";
import { isCloudinaryFolderUrl } from "@/server/media/cloudinary";
import {
  MediaProviderFailure,
  imageFolderForUser,
  uploadImageToCloudinary,
  validateImageFile,
  type CloudinaryConfig,
  type ProviderFailureReason,
  type ValidatedImageFile,
} from "@/server/media/image-upload";
import {
  UPLOAD_REQUEST_ID_HEADER,
  logUploadStage,
  mimeCategory,
  newUploadRequestId,
  sizeBucketFor,
  type UploadDiagnosticFields,
  type UploadStage,
} from "@/server/media/upload-diagnostics";
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

/** Provider diagnosis for the log line; never part of the client response. */
function providerFailureFields(error: unknown): {
  provider_reason?: ProviderFailureReason;
  provider_status?: number;
} {
  if (!(error instanceof MediaProviderFailure)) return {};
  return {
    provider_reason: error.reason,
    ...(error.providerStatus !== undefined
      ? { provider_status: error.providerStatus }
      : {}),
  };
}

export function createPostMediaUploadRoute(deps: PostMediaRouteDeps) {
  const uploader = deps.uploader ?? cloudinaryPostMediaUploader;
  const readConfig = deps.readConfig ?? readCloudinaryConfig;

  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      // TASK-008G: one opaque id per request, returned in a response header so
      // the owner can match a browser failure to exactly one Vercel log line.
      const requestId = newUploadRequestId();
      const startedAt = Date.now();
      const elapsed = () => Date.now() - startedAt;
      let failureLogged = false;

      const logStage = (
        stage: UploadStage,
        extra: Partial<UploadDiagnosticFields> = {},
        level: "info" | "warn" | "error" = "info",
      ) => {
        logUploadStage(
          stage,
          { request_id: requestId, duration_ms: elapsed(), ...extra },
          level,
        );
      };
      const logFailure = (
        stage: UploadStage,
        extra: Partial<UploadDiagnosticFields> = {},
      ) => {
        failureLogged = true;
        logStage(stage, extra, "warn");
      };

      logStage("received");

      try {
        try {
          requireSameOrigin(request);
        } catch (error) {
          logFailure("origin_rejected", { http_status: 403 });
          throw error;
        }

        let user;
        try {
          user = requireAuthenticatedUser(session);
        } catch (error) {
          logFailure("auth_denied", { http_status: 401 });
          throw error;
        }
        logStage("authorized");

        const config = readConfig();
        if (!config) {
          logFailure("config_missing", {
            http_status: 503,
            config_present: false,
          });
          return Response.json(
            {
              error: {
                code: "service_unavailable",
                message:
                  "Post photos are not configured yet. The owner must set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and MEDIA_PROVIDER_ADAPTER=cloudinary in the Preview environment. You can still publish a text-only post.",
              },
            },
            {
              status: 503,
              headers: {
                "cache-control": "no-store",
                [UPLOAD_REQUEST_ID_HEADER]: requestId,
              },
            },
          );
        }
        logStage("config_present", { config_present: true });

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          logFailure("body_unreadable", { http_status: 400 });
          throw badRequest("Expected a multipart/form-data request body.");
        }

        const fileEntry = form.get("file");
        if (!fileEntry || !(fileEntry instanceof Blob)) {
          logFailure("file_missing", { http_status: 400 });
          throw badRequest("A photo file is required (field: file).");
        }

        let bytes: Uint8Array;
        try {
          bytes = new Uint8Array(await fileEntry.arrayBuffer());
        } catch {
          logFailure("body_unreadable", { http_status: 400 });
          throw badRequest("The photo could not be read.");
        }

        let validated: ValidatedImageFile;
        try {
          validated = validateImageFile(
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
        } catch (error) {
          logFailure("validation_failed", {
            http_status: 400,
            size_bucket: sizeBucketFor(bytes.length),
          });
          throw error;
        }

        logStage("validation_passed", {
          mime_category: mimeCategory(validated.mime),
          size_bucket: sizeBucketFor(validated.bytes.length),
        });

        const providerStartedAt = Date.now();
        logStage("provider_started");

        let uploaded: { mediaUrl: string };
        try {
          uploaded = await uploader({
            ...validated,
            userId: user.userId,
            config,
          });
        } catch (error) {
          logFailure("provider_failed", {
            http_status: 500,
            duration_ms: Date.now() - providerStartedAt,
            ...providerFailureFields(error),
          });
          throw error;
        }

        logStage("provider_succeeded", {
          duration_ms: Date.now() - providerStartedAt,
        });
        logStage("completed", { http_status: 200 });

        return Response.json(
          { mediaUrl: uploaded.mediaUrl },
          {
            headers: {
              "cache-control": "no-store",
              [UPLOAD_REQUEST_ID_HEADER]: requestId,
            },
          },
        );
      } catch (error) {
        if (!failureLogged) {
          logStage(
            "internal_failed",
            {
              http_status: statusForCode(
                error instanceof AppError ? error.code : "internal_error",
              ),
              ...providerFailureFields(error),
            },
            "error",
          );
        }
        // Same status, code and user-facing wording as before; only the
        // correlation header is new.
        const safe =
          error instanceof AppError
            ? error
            : new AppError(
                "internal_error",
                "Something went wrong. Please try again later.",
              );
        throw new AppError(safe.code, safe.safeMessage, {
          [UPLOAD_REQUEST_ID_HEADER]: requestId,
        });
      }
    },
  });
}

const moduleDeps: PostMediaRouteDeps = {
  sessionSource: getLazySessionSource(),
  limiter: createPostMediaLimiter(),
};

export const POST = createPostMediaUploadRoute(moduleDeps);
