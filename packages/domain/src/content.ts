import { z } from "zod";

/**
 * Content boundary (contract shapes only) for the MVP's text/image-first feed.
 *
 * The video pipeline is deferred (media costs/processing first) and live
 * streaming is deferred; these shapes do not introduce either.
 *
 * TASK-008A turns the previous placeholder into the contracts the real feed,
 * composer and discovery surfaces share with the Android app:
 *
 * - a post is a caption plus at most one image (the blueprint's text/image
 *   first rule; galleries belong to the media pipeline task),
 * - topics are derived from `#hashtags` in the caption — there is no separate
 *   taxonomy table the client can invent entries for,
 * - the feed payload is an explicit allowlist (`PostViewDto`) that carries no
 *   auth subject, internal id or visibility flag.
 */

export const contentVisibilitySchema = z.enum([
  "public",
  "followers",
  "private",
]);

export const postSchema = z.object({
  id: z.uuid().optional(),
  authorId: z.uuid(),
  text: z.string().min(1).max(5000),
  /** Media URLs for image attachments only in the MVP; cap is small on purpose. */
  imageUrls: z.array(z.url()).max(4),
  visibility: contentVisibilitySchema,
});

export type Post = z.infer<typeof postSchema>;

/** Caption bounds. Chosen so a phone keyboard post stays one screen of text. */
export const POST_BODY_MAX_LENGTH = 1000;
export const POST_MEDIA_ALT_MAX_LENGTH = 280;
export const POST_MEDIA_URL_MAX_LENGTH = 2048;
export const POST_TOPIC_MAX_LENGTH = 40;
export const POST_TOPICS_MAX = 5;
export const FEED_PAGE_MAX = 20;
export const FEED_PAGE_DEFAULT = 10;

/** Image posts use the same bounds as the TASK-007B avatar upload. */
export const POST_MEDIA_MAX_BYTES = 4 * 1024 * 1024;
export const ALLOWED_POST_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedPostMediaMime =
  (typeof ALLOWED_POST_MEDIA_MIME_TYPES)[number];

/** `https:` only — the database CHECK repeats this rule. */
export const postMediaUrlSchema = z
  .string()
  .max(POST_MEDIA_URL_MAX_LENGTH)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "must be an https URL");

/**
 * Canonical topic form: lowercase letters, digits and underscores, 2–40 chars.
 * `#Design` and `#design` are the same topic; a bare `#` is not a topic.
 */
export const postTopicSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(POST_TOPIC_MAX_LENGTH)
  .regex(/^[a-z0-9_]+$/);

/**
 * Extract up to `POST_TOPICS_MAX` unique topics from a caption.
 *
 * Pure and deterministic so the composer preview, the server and the Android
 * client cannot disagree about what a post is tagged with. Matching is done on
 * the raw text with a word-boundary-ish guard: `abc#def` (an email fragment or
 * a URL query) does not produce a topic.
 */
export function extractTopics(text: string): string[] {
  const topics: string[] = [];
  // Strip URLs first: `https://x.test/#fragment` is a fragment, not a topic.
  const withoutLinks = text.replace(/https?:\/\/\S+/giu, " ");
  const pattern = /(^|[^\p{L}\p{N}_#])#([\p{L}\p{N}_]{2,40})/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withoutLinks)) !== null) {
    const topic = match[2]?.toLowerCase();
    if (!topic) continue;
    if (topics.length >= POST_TOPICS_MAX) break;
    if (!topics.includes(topic)) topics.push(topic);
  }
  return topics;
}

/** Create-post input. Strict, so `identityId`/`authorId` in a body is a 400. */
export const postCreateSchema = z
  .object({
    body: z.string().trim().min(1).max(POST_BODY_MAX_LENGTH),
    mediaUrl: z.union([postMediaUrlSchema, z.literal(""), z.null()]).optional(),
    mediaAlt: z.string().trim().max(POST_MEDIA_ALT_MAX_LENGTH).optional(),
  })
  .strict();

export type PostCreateInput = z.infer<typeof postCreateSchema>;

/**
 * Public post payload. The author block is the same four-field allowlist as
 * the public profile; nothing here identifies an account internally.
 */
export interface PostAuthorDto {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PostViewDto {
  id: string;
  body: string;
  mediaUrl: string | null;
  mediaAlt: string | null;
  /** ISO timestamp; clients format it, the server also sends a stable label. */
  createdAt: string;
  timeLabel: string;
  topics: string[];
  author: PostAuthorDto;
  likeCount: number;
  likedByViewer: boolean;
  isOwner: boolean;
}

export interface PostPageDto {
  posts: PostViewDto[];
  nextCursor: string | null;
}

export interface CreatorSuggestionDto {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  postCount: number;
}

export interface TrendingTopicDto {
  topic: string;
  postCount: number;
}

/**
 * Stable, locale-independent time label ("now", "5m", "2h", "3d", "12 Mar").
 * Computed where the data is read so server HTML and client hydration agree.
 */
export function formatPostTime(
  createdAt: Date,
  now: Date = new Date(),
): string {
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - createdAt.getTime()) / 1000),
  );
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
