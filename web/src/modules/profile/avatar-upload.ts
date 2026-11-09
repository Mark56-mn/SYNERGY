import "server-only";

import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_HEIGHT,
  AVATAR_MAX_WIDTH,
  type AllowedAvatarMime,
} from "@synergy/domain";

import { badRequest, internalError } from "@/server/http/errors";
import {
  isCloudinaryAvatarUrl as isAvatarUrlInFolder,
  isCloudinaryFolderUrl,
} from "@/server/media/cloudinary";
import {
  cloudinarySignature,
  imageFolderForUser,
  parseImageDimensions as parseDimensions,
  sniffImageMime,
  uploadImageToCloudinary,
  validateImageFile,
  type CloudinaryConfig as SharedCloudinaryConfig,
  type ImageFile,
  type ValidatedImageFile,
} from "@/server/media/image-upload";

/**
 * Avatar file validation + Cloudinary upload (TASK-007B).
 *
 * TASK-008B moved the byte-level work into `@/server/media/image-upload` so the
 * post-photo upload shares one implementation. This module keeps the avatar
 * contract (limits, folder, verifier, error copy) that the profile route and
 * its tests depend on.
 */

export type AvatarFile = ImageFile;
export type ValidatedAvatarFile = ValidatedImageFile;
export type CloudinaryConfig = SharedCloudinaryConfig;

export const AVATAR_LIMITS = {
  maxBytes: AVATAR_MAX_BYTES,
  maxWidth: AVATAR_MAX_WIDTH,
  maxHeight: AVATAR_MAX_HEIGHT,
} as const;

export function parseImageDimensions(
  mime: AllowedAvatarMime,
  bytes: Uint8Array,
): { width: number; height: number } | null {
  return parseDimensions(mime, bytes);
}

export function sniffAvatarMime(bytes: Uint8Array): AllowedAvatarMime | null {
  return sniffImageMime(bytes);
}

export function validateAvatarFile(file: AvatarFile): ValidatedAvatarFile {
  return validateImageFile(file, AVATAR_LIMITS);
}

/** Opaque, non-reversible folder key for the verified session. */
export function avatarFolderForUser(userId: string): string {
  return imageFolderForUser("avatars", userId);
}

export { cloudinarySignature };

export interface UploadedAvatar {
  /** Canonical HTTPS secure URL persisted as the avatar URL. */
  avatarUrl: string;
  mime: AllowedAvatarMime;
  bytes: number;
  width: number;
  height: number;
}

export type CloudinaryUploader = (
  input: ValidatedAvatarFile & { userId: string; config: CloudinaryConfig },
) => Promise<UploadedAvatar>;

/** Production Cloudinary uploader for profile photos. */
export const cloudinaryAvatarUploader: CloudinaryUploader = async (input) => {
  const folder = avatarFolderForUser(input.userId);
  const { secureUrl } = await uploadImageToCloudinary({
    validated: input,
    folder,
    publicIdPrefix: "avatar",
    config: input.config,
  });

  if (!isCloudinaryAvatarUrl(secureUrl, input.config.cloudName)) {
    throw internalError();
  }

  return {
    avatarUrl: secureUrl,
    mime: input.mime,
    bytes: input.bytes.length,
    width: input.width,
    height: input.height,
  };
};

/**
 * Is a persisted URL one of ours? https, `res.cloudinary.com`, configured
 * cloud, and under the avatars folder.
 */
export function isCloudinaryAvatarUrl(url: string, cloudName: string): boolean {
  return isAvatarUrlInFolder(url, cloudName);
}

/**
 * When the deployment is Cloudinary-backed, every new avatar URL must be one
 * of ours — this closes the "PATCH an arbitrary https URL" bypass for those
 * deployments. Existing URLs in the stub/dev environment keep the https-only
 * check from the domain schema.
 */
export function assertAvatarUrlAllowed(
  url: string | null | undefined,
  opts: { cloudinaryEnabled: boolean; cloudName?: string },
): void {
  if (!url) return;
  if (!opts.cloudinaryEnabled) return;
  if (!opts.cloudName || !isCloudinaryAvatarUrl(url, opts.cloudName)) {
    throw badRequest(
      "Profile photos must be uploaded through SYNERGY photo selection.",
    );
  }
}

export { isCloudinaryFolderUrl };
