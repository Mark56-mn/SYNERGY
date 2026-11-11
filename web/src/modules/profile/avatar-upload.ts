import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import {
  ALLOWED_AVATAR_MIME_TYPES,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_HEIGHT,
  AVATAR_MAX_WIDTH,
  type AllowedAvatarMime,
} from "@synergy/domain";

import { badRequest, internalError } from "@/server/http/errors";

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

export interface SupabaseMediaConfig {
  url: string;
  secretKey: string;
  bucket: string;
}

/** Backward-compatible alias for the previous Supabase config name. */
export type SupabaseConfig = SupabaseMediaConfig;

export type AvatarUploader = (
  input: ValidatedAvatarFile & {
    userId: string;
    config: CloudinaryConfig | SupabaseMediaConfig;
    accessToken?: string | null;
    previousAvatarUrl?: string | null;
  },
) => Promise<UploadedAvatar>;

export interface UploadedAvatar {
  /** Canonical stored reference (object path for Supabase media, URL for Cloudinary). */
  avatarUrl: string;
  mime: AllowedAvatarMime;
  bytes: number;
  width: number;
  height: number;
}

export function parseImageDimensions(
  mime: AllowedAvatarMime,
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (mime === "image/png") {
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

export function validateAvatarFile(file: AvatarFile): ValidatedAvatarFile {
  if (file.bytes.length === 0) {
    throw badRequest("The selected file is empty.");
  }
  if (file.bytes.length > AVATAR_MAX_BYTES) {
    throw badRequest("The photo is too large. Choose a picture under 5 MB.");
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

export function avatarFolderForUser(userId: string): string {
  const digest = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `synergy/avatars/${digest}`;
}

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

export function isCloudinaryAvatarUrl(url: string, cloudName: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      (cloudName === "" ||
        parsed.pathname.startsWith(`/${cloudName}/image/upload/`)) &&
      parsed.pathname.includes("/synergy/avatars/")
    );
  } catch {
    return false;
  }
}

export function isLegacyCloudinaryAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

/** A stored Supabase media reference is a relative object path, never a URL. */
export function isSupabaseMediaReference(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  if (value.includes("://") || value.startsWith("/")) return false;
  const segments = value.split("/");
  if (segments.length < 2) return false;
  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    return false;
  }
  if (
    segments.some((segment) => segment.includes("\\") || segment.includes("\0"))
  ) {
    return false;
  }
  const filename = segments[segments.length - 1] ?? "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
}

/** Backward-compatible alias for the previous public-URL helper. */
export function isSupabaseAvatarUrl(
  url: string,
  supabaseUrl: string,
  bucket: string,
): boolean {
  try {
    const parsed = new URL(url);
    const base = new URL(supabaseUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== base.hostname) {
      return false;
    }
    const prefix = `/storage/v1/object/public/${bucket}/`;
    return parsed.pathname.startsWith(prefix);
  } catch {
    return false;
  }
}

export function supabaseAvatarPathFromUrl(
  url: string,
  supabaseUrl: string,
  bucket: string,
): string | null {
  try {
    const parsed = new URL(url);
    const base = new URL(supabaseUrl);
    if (parsed.hostname !== base.hostname) return null;
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (!parsed.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(parsed.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

export async function deleteSupabaseMediaAvatar(
  config: SupabaseMediaConfig,
  objectPath: string,
  userId: string,
): Promise<void> {
  if (!isSupabaseMediaReference(objectPath)) return;
  const ownerSegment = objectPath.split("/")[0];
  if (ownerSegment !== userId) return;

  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.storage.from(config.bucket).remove([objectPath]);
}

/** Backward-compatible alias. */
export async function deleteSupabaseAvatarByUrl(
  urlOrPath: string,
  userId: string,
  config: { url: string; secretKey?: string; anonKey?: string; bucket: string },
): Promise<void> {
  const secretKey = config.secretKey ?? config.anonKey ?? "";
  if (!secretKey) return;
  if (isSupabaseMediaReference(urlOrPath)) {
    await deleteSupabaseMediaAvatar(
      { url: config.url, secretKey, bucket: config.bucket },
      urlOrPath,
      userId,
    );
    return;
  }
  const objectPath = supabaseAvatarPathFromUrl(
    urlOrPath,
    config.url,
    config.bucket,
  );
  if (!objectPath) return;
  const ownerSegment = objectPath.split("/")[0];
  if (ownerSegment !== userId) return;
  const client = createClient(config.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await client.storage.from(config.bucket).remove([objectPath]);
}

export async function createSignedAvatarUrl(
  config: SupabaseMediaConfig,
  objectPath: string,
  expiresInSeconds = 300,
): Promise<string> {
  if (!isSupabaseMediaReference(objectPath)) {
    throw badRequest("Invalid avatar reference.");
  }
  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.storage
    .from(config.bucket)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw internalError();
  }
  return data.signedUrl;
}

export const supabaseMediaUploader: AvatarUploader = async (input) => {
  const { config, userId, bytes, mime, previousAvatarUrl } =
    input as ValidatedAvatarFile & {
      userId: string;
      config: SupabaseMediaConfig;
      previousAvatarUrl?: string | null;
    };

  const secretConfig = config as SupabaseMediaConfig;
  const ext =
    mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const publicId = `avatar_${createHash("sha256")
    .update(userId + Date.now())
    .digest("hex")
    .slice(0, 12)}`;
  const objectPath = `${userId}/${publicId}.${ext}`;

  const client = createClient(secretConfig.url, secretConfig.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.storage
    .from(secretConfig.bucket)
    .upload(objectPath, bytes, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000",
    });
  if (error) {
    throw internalError();
  }

  // Replace without leaving an orphaned object behind.
  if (previousAvatarUrl && isSupabaseMediaReference(previousAvatarUrl)) {
    try {
      await deleteSupabaseMediaAvatar(secretConfig, previousAvatarUrl, userId);
    } catch {
      // Best-effort cleanup; the new avatar is already stored.
    }
  } else if (
    previousAvatarUrl &&
    isSupabaseAvatarUrl(
      previousAvatarUrl,
      secretConfig.url,
      secretConfig.bucket,
    )
  ) {
    try {
      await deleteSupabaseAvatarByUrl(previousAvatarUrl, userId, secretConfig);
    } catch {
      // Best-effort cleanup.
    }
  }

  return {
    avatarUrl: objectPath,
    mime,
    bytes: bytes.length,
    width: input.width,
    height: input.height,
  };
};

/** Backward-compatible alias for the previous uploader name. */
export const supabaseAvatarUploader = supabaseMediaUploader;

export function assertAvatarUrlAllowed(
  value: string | null | undefined,
  opts: {
    cloudinaryEnabled: boolean;
    cloudName?: string;
    mediaEnabled?: boolean;
    mediaUrl?: string;
    mediaBucket?: string;
    supabaseEnabled?: boolean;
    supabaseUrl?: string;
    supabaseBucket?: string;
  },
  userId?: string,
): void {
  if (!value) return;

  const cloudinaryActive = opts.cloudinaryEnabled && !!opts.cloudName;
  const mediaActive = Boolean(
    opts.mediaEnabled ??
    (opts.supabaseEnabled && opts.supabaseUrl && opts.supabaseBucket),
  );

  if (!cloudinaryActive && !mediaActive) return;

  if (isLegacyCloudinaryAvatarUrl(value)) return;

  if (cloudinaryActive && isCloudinaryAvatarUrl(value, opts.cloudName!)) {
    return;
  }

  if (mediaActive) {
    if (isSupabaseMediaReference(value)) {
      if (userId && value.split("/")[0] !== userId) {
        throw badRequest(
          "Profile photos must be uploaded through SYNERGY photo selection.",
        );
      }
      return;
    }
    const mediaUrl = opts.mediaUrl ?? opts.supabaseUrl;
    const mediaBucket = opts.mediaBucket ?? opts.supabaseBucket;
    if (
      mediaUrl &&
      mediaBucket &&
      isSupabaseAvatarUrl(value, mediaUrl, mediaBucket)
    ) {
      return;
    }
  }

  throw badRequest(
    "Profile photos must be uploaded through SYNERGY photo selection.",
  );
}
