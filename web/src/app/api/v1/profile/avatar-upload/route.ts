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
import { readRequestAccessToken } from "@/server/provider-access";
import {
  supabaseAvatarUploader,
  validateAvatarFile,
  type AvatarUploader,
  type SupabaseConfig,
} from "@/modules/profile/avatar-upload";

/**
 * `POST /api/v1/profile/avatar-upload` — upload a profile photo to Supabase
 * Storage.
 *
 * Multipart body with a single `file` field. The server:
 *
 * 1. resolves the verified session (never trusts a browser-supplied owner),
 * 2. requires the same origin (cookie CSRF defence),
 * 3. rate-limits the caller,
 * 4. sniffs and validates the bytes (JPEG / PNG / WebP, <=4 MB, <=8000px),
 * 5. uploads to Supabase Storage with the member's own access token under an
 *    owner-restricted object path, and
 * 6. returns only the verified public `avatarUrl`.
 *
 * The profile row is changed by the subsequent `PATCH /api/v1/profile` save, so
 * a failed upload never overwrites a previously saved photo. Replaced objects
 * are removed best-effort after a successful upload.
 *
 * Cloudinary is no longer used on this path; previously stored Cloudinary URLs
 * remain valid as a backward-compatible fallback.
 */

export interface AvatarUploadRouteDeps {
  sessionSource: SessionSource;
  uploader?: AvatarUploader;
  limiter?: RateLimiter;
  readConfig?: () => SupabaseConfig | null;
  readAccessToken?: (request: Request) => string | null;
}

function readSupabaseConfig(): SupabaseConfig | null {
  try {
    const env = getEnv();
    if (!env.SUPABASE_AUTH_URL || !env.SUPABASE_AUTH_ANON_KEY) return null;
    return {
      url: env.SUPABASE_AUTH_URL,
      anonKey: env.SUPABASE_AUTH_ANON_KEY,
      bucket: env.SUPABASE_STORAGE_BUCKET ?? "avatars",
    };
  } catch {
    return null;
  }
}

export function createAvatarUploadLimiter(): RateLimiter {
  return createInMemoryRateLimiter({ maxPerWindow: 10, windowSeconds: 60 });
}

export function createAvatarUploadRoute(deps: AvatarUploadRouteDeps) {
  const uploader = deps.uploader ?? supabaseAvatarUploader;
  const readConfig = deps.readConfig ?? readSupabaseConfig;
  const readAccessToken = deps.readAccessToken ?? readRequestAccessToken;

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
                "Photo uploads are not configured yet. The owner must add SUPABASE_AUTH_URL and SUPABASE_AUTH_ANON_KEY to the environment.",
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
          accessToken: readAccessToken(request),
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
