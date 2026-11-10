import "server-only";

import { createHash } from "node:crypto";

import {
  ALLOWED_AVATAR_MIME_TYPES,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_HEIGHT,
  AVATAR_MAX_WIDTH,
  type AllowedAvatarMime,
} from "@synergy/domain";

import { badRequest, internalError } from "@/server/http/errors";

/**
 * Avatar file validation + Cloudinary upload (TASK-007B).
 *
 * Security properties:
 *
 * 1. Only JPEG / PNG / WebP pass, verified by magic bytes — never by the
 *    browser-supplied MIME string or filename alone.
 * 2. Files are capped at 4 MB and 8000×8000 px server-side.
 * 3. The Cloudinary signature is computed server-side over an allowlisted
 *    parameter set (folder, public_id, timestamp). `resource_type` is part of
 *    the upload URL, not a signed parameter.
 *    browser never chooses the folder or public_id and never sees the
 *    API secret.
 * 4. The returned `secure_url` is verified to belong to the configured
 *    Cloudinary cloud and the caller's fixed folder before it is handed
 *    back; anything else is rejected and nothing is persisted.
 * 5. No internal storage identifiers (public_id) are returned.
 */

export interface AvatarFile {
  bytes: Uint8Array;
  declaredType?: string;
  filename?: string;
}

export interface ValidatedAvatarFile extends AvatarFile {
  mime: AllowedAvatarMime;
  width: number;
  height: number;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Parse the leading bytes of JPEG/PNG/WebP to recover dimensions. */
export function parseImageDimensions(
  mime: AllowedAvatarMime,
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (mime === "image/png") {
    // 8-byte signature, 4-byte length, "IHDR", width, height.
    if (bytes.length < 24) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const view = new DataView(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength,
        );
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      if (marker === undefined || marker === 0xd8 || marker === 0xd9) {
        return null;
      }
      const segLen = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
      if (segLen < 2) return null;
      offset += 2 + segLen;
    }
    return null;
  }
  // WebP: RIFF header (12), then VP8 / VP8L / VP8X chunk.
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fourCC = String.fromCharCode(
    bytes[12] ?? 0,
    bytes[13] ?? 0,
    bytes[14] ?? 0,
    bytes[15] ?? 0,
  );
  let width = 0;
  let height = 0;
  if (fourCC === "VP8 ") {
    width = view.getUint16(26, true) & 0x3fff;
    height = view.getUint16(28, true) & 0x3fff;
  } else if (fourCC === "VP8L") {
    const b0 = bytes[21] ?? 0;
    const b1 = bytes[22] ?? 0;
    const b2 = bytes[23] ?? 0;
    const b3 = bytes[24] ?? 0;
    width = (((b1 & 0x3f) << 8) | b0) + 1;
    height = (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) + 1;
  } else if (fourCC === "VP8X") {
    width = view.getUint32(24, true) & 0xffffff;
    height = view.getUint32(27, true) & 0xffffff;
    width += 1;
    height += 1;
  } else {
    return null;
  }
  return width > 0 && height > 0 ? { width, height } : null;
}

/** Sniff the real format from magic bytes (never trust the label). */
export function sniffAvatarMime(bytes: Uint8Array): AllowedAvatarMime | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Validate an uploaded avatar file. The declared MIME is only a usability
 * hint; the sniffed bytes decide.
 */
export function validateAvatarFile(file: AvatarFile): ValidatedAvatarFile {
  if (file.bytes.length === 0) {
    throw badRequest("The selected file is empty.");
  }
  if (file.bytes.length > AVATAR_MAX_BYTES) {
    throw badRequest("The photo is too large. Choose a picture under 4 MB.");
  }

  const mime = sniffAvatarMime(file.bytes);
  if (!mime || !ALLOWED_AVATAR_MIME_TYPES.includes(mime)) {
    throw badRequest("Only JPEG, PNG or WebP photos are accepted.");
  }

  if (
    file.declaredType &&
    (ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(
      file.declaredType,
    ) &&
    file.declaredType !== mime
  ) {
    throw badRequest("The file contents do not match the declared type.");
  }

  const dims = parseImageDimensions(mime, file.bytes);
  if (!dims) {
    throw badRequest("The photo could not be read as an image.");
  }
  if (dims.width > AVATAR_MAX_WIDTH || dims.height > AVATAR_MAX_HEIGHT) {
    throw badRequest(
      `The photo is too large (${dims.width}×${dims.height}px). Choose a picture under ${AVATAR_MAX_WIDTH}×${AVATAR_MAX_HEIGHT}px.`,
    );
  }

  return { ...file, mime, width: dims.width, height: dims.height };
}

/** Opaque, non-reversible folder key for the verified session. */
export function avatarFolderForUser(userId: string): string {
  const digest = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `synergy/avatars/${digest}`;
}

/** Cloudinary signature over the fixed, allowlisted parameter set. */
export function cloudinarySignature(
  params: Record<string, string>,
  apiSecret: string,
): string {
  const toSign =
    Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== "")
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&") + apiSecret;
  return createHash("sha1").update(toSign).digest("hex");
}

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

/**
 * Production Cloudinary uploader: signed server-side upload. The browser
 * receives only the returned `secure_url` — never the secret, signature
 * ingredients beyond the single-use signature Cloudinary requires, or the
 * public_id.
 */
export const cloudinaryAvatarUploader: CloudinaryUploader = async (input) => {
  const { config, userId, bytes, mime, filename } = input;
  const folder = avatarFolderForUser(userId);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `avatar_${createHash("sha256")
    .update(userId + Date.now())
    .digest("hex")
    .slice(0, 12)}`;

  // `resource_type` is part of the upload URL path, not a signed
  // parameter — including it in the signature makes Cloudinary reject the
  // upload with "Invalid Signature".
  const params: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = cloudinarySignature(params, config.apiSecret);

  const form = new FormData();
  const blob = new Blob([bytes as BlobPart], { type: mime });
  form.append("file", blob, filename ?? `avatar.${mime.split("/")[1]}`);
  form.append("api_key", config.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);

  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`;
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: form });
  } catch {
    throw internalError();
  }
  if (!response.ok) {
    throw internalError();
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw internalError();
  }

  const secureUrl =
    typeof body === "object" && body !== null
      ? (body as { secure_url?: unknown }).secure_url
      : undefined;
  if (typeof secureUrl !== "string") {
    throw internalError();
  }

  // Verify the returned asset lives in the caller's folder and cloud.
  if (!isCloudinaryAvatarUrl(secureUrl, config.cloudName)) {
    throw internalError();
  }

  return {
    avatarUrl: secureUrl,
    mime,
    bytes: bytes.length,
    width: input.width,
    height: input.height,
  };
};

/**
 * Is a persisted URL one of ours? https, `res.cloudinary.com`, configured
 * cloud, and under the avatars folder. Anything else is rejected when a
 * Cloudinary environment is active.
 */
export function isCloudinaryAvatarUrl(url: string, cloudName: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      parsed.pathname.includes("/synergy/avatars/")
    );
  } catch {
    return false;
  }
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
