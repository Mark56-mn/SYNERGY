import "server-only";

import { createHash } from "node:crypto";

import { badRequest, internalError } from "@/server/http/errors";

import { isCloudinaryFolderUrl } from "./cloudinary";

/**
 * Shared image-upload primitives (TASK-007B avatar, generalised in TASK-008B
 * for post photos).
 *
 * Security properties, unchanged from the profile-photo flow:
 *
 * 1. Only JPEG / PNG / WebP pass, verified by magic bytes — never by the
 *    browser-supplied MIME string or filename alone.
 * 2. Size and pixel caps are enforced server-side with the caller's limits.
 * 3. The Cloudinary signature is computed server-side over an allowlisted
 *    parameter set (folder, public_id, resource_type, timestamp). The browser
 *    chooses neither the folder nor the public_id and never sees the secret.
 * 4. The returned `secure_url` must belong to the configured cloud AND the
 *    expected folder, otherwise it is rejected and nothing is persisted.
 * 5. Internal storage identifiers are not returned to the caller.
 */

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ImageMime = (typeof IMAGE_MIME_TYPES)[number];

export interface ImageFile {
  bytes: Uint8Array;
  declaredType?: string;
  filename?: string;
}

export interface ImageLimits {
  maxBytes: number;
  maxWidth: number;
  maxHeight: number;
}

export interface ValidatedImageFile extends ImageFile {
  mime: ImageMime;
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
  mime: ImageMime,
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
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
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
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Validate an uploaded image. The declared MIME is only a usability hint; the
 * sniffed bytes decide, and a declared/allowed type that disagrees with the
 * bytes is rejected rather than silently trusted.
 */
export function validateImageFile(
  file: ImageFile,
  limits: ImageLimits,
): ValidatedImageFile {
  if (file.bytes.length === 0) {
    throw badRequest("The selected file is empty.");
  }
  if (file.bytes.length > limits.maxBytes) {
    throw badRequest(
      `The photo is too large. Choose a picture under ${Math.round(
        limits.maxBytes / (1024 * 1024),
      )} MB.`,
    );
  }

  const mime = sniffImageMime(file.bytes);
  if (!mime || !IMAGE_MIME_TYPES.includes(mime)) {
    throw badRequest("Only JPEG, PNG or WebP photos are accepted.");
  }

  if (
    file.declaredType &&
    (IMAGE_MIME_TYPES as readonly string[]).includes(file.declaredType) &&
    file.declaredType !== mime
  ) {
    throw badRequest("The file contents do not match the declared type.");
  }

  const dims = parseImageDimensions(mime, file.bytes);
  if (!dims) {
    throw badRequest("The photo could not be read as an image.");
  }
  if (dims.width > limits.maxWidth || dims.height > limits.maxHeight) {
    throw badRequest(
      `The photo is too large (${dims.width}×${dims.height}px). Choose a picture under ${limits.maxWidth}×${limits.maxHeight}px.`,
    );
  }

  return { ...file, mime, width: dims.width, height: dims.height };
}

/** Opaque, non-reversible per-member folder: `synergy/<kind>/<hash16>`. */
export function imageFolderForUser(
  kind: "avatars" | "posts",
  userId: string,
): string {
  const digest = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `synergy/${kind}/${digest}`;
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

export interface CloudinaryUploadInput {
  validated: ValidatedImageFile;
  folder: string;
  publicIdPrefix: string;
  config: CloudinaryConfig;
}

/**
 * Signed server-side Cloudinary upload. Returns the verified `secure_url`;
 * the secret, signature and public_id never reach the browser.
 */
export async function uploadImageToCloudinary(
  input: CloudinaryUploadInput,
): Promise<{ secureUrl: string; publicId: string }> {
  const { validated, folder, publicIdPrefix, config } = input;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `${publicIdPrefix}_${createHash("sha256")
    .update(`${folder}:${Date.now()}:${validated.bytes.length}`)
    .digest("hex")
    .slice(0, 12)}`;

  const params: Record<string, string> = {
    folder,
    public_id: publicId,
    resource_type: "image",
    timestamp,
  };
  const signature = cloudinarySignature(params, config.apiSecret);

  const form = new FormData();
  form.append(
    "file",
    new Blob([validated.bytes as BlobPart], { type: validated.mime }),
    validated.filename ?? `image.${validated.mime.split("/")[1]}`,
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("resource_type", "image");
  form.append("overwrite", "false");
  form.append("unique_filename", "true");

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
  if (
    typeof secureUrl !== "string" ||
    !isCloudinaryFolderUrl(secureUrl, config.cloudName, folder)
  ) {
    throw internalError();
  }

  return { secureUrl, publicId };
}
