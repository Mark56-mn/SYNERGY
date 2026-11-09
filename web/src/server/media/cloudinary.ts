import "server-only";

/**
 * Cloudinary URL verification shared by the profile-photo and post-photo
 * uploads.
 *
 * A stored media URL is public data that the browser will fetch, so it must be
 * provably ours: `https:`, the configured Cloudinary cloud, an `image/upload`
 * path, and inside the expected folder. Anything else (another host, a
 * `http:` URL, a different folder) is rejected rather than rendered.
 */
export function isCloudinaryFolderUrl(
  url: string,
  cloudName: string,
  folder: string,
): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "res.cloudinary.com") return false;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] !== cloudName) return false;
    if (segments[1] !== "image" || segments[2] !== "upload") return false;
    const path = decodeURIComponent(segments.slice(3).join("/"));
    return path.startsWith(`${folder}/`);
  } catch {
    return false;
  }
}

/** Avatar uploads live under `synergy/avatars/<opaque member folder>`. */
export function isCloudinaryAvatarUrl(url: string, cloudName: string): boolean {
  return isCloudinaryFolderUrl(url, cloudName, "synergy/avatars");
}

/** Post photos live under `synergy/posts/<opaque member folder>`. */
export function isCloudinaryPostUrl(url: string, cloudName: string): boolean {
  return isCloudinaryFolderUrl(url, cloudName, "synergy/posts");
}
