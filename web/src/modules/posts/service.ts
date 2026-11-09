import "server-only";

import {
  extractTopics,
  formatPostTime,
  postCreateSchema,
  FEED_PAGE_DEFAULT,
  FEED_PAGE_MAX,
  type CreatorSuggestionDto,
  type PostCreateInput,
  type PostPageDto,
  type PostViewDto,
  type TrendingTopicDto,
} from "@synergy/domain";

import type { Session } from "@/server/auth/session";
import { requireAuthenticatedUser } from "@/server/authz";
import { getEnv } from "@/server/env";
import { badRequest, forbidden, notFound } from "@/server/http/errors";
import { isCloudinaryPostUrl } from "@/server/media/cloudinary";

import type {
  AuthorRecord,
  FeedCursor,
  PostRecord,
  PostRepository,
} from "./repository";

/**
 * Publishing service — the ONE place that decides who may publish, read or
 * like a post.
 *
 * Security properties (proved by `tests/posts-service.test.ts`):
 *
 * 1. The author is always the verified session subject. No method accepts an
 *    author id from request data, and the create schema is strict.
 * 2. Visibility is enforced by the repository query (profile public OR caller
 *    is the author). The service re-filters defensively, so a future repository
 *    regression cannot leak a private author's post.
 * 3. Deleting is owner-only. A non-owner receives 404 — not 403 — so the API
 *    is not an existence oracle for other members' posts.
 * 4. DTOs are an explicit allowlist: no auth subject, internal id or
 *    visibility flag ever leaves this layer.
 * 5. Publishing requires a profile, so a post can always be attributed.
 */

export interface PostsService {
  getFeed(
    session: Session | null,
    options?: { limit?: string | number | null; cursor?: string | null },
  ): Promise<PostPageDto>;
  getPostsByUsername(
    session: Session | null,
    username: string,
    options?: { limit?: string | number | null; cursor?: string | null },
  ): Promise<PostPageDto>;
  createPost(
    session: Session | null,
    input: PostCreateInput,
  ): Promise<PostViewDto>;
  deletePost(session: Session | null, postId: string): Promise<void>;
  setLike(
    session: Session | null,
    postId: string,
    liked: boolean,
  ): Promise<{ likeCount: number; liked: boolean }>;
  searchPosts(
    session: Session | null,
    options: { query?: string | null; topic?: string | null; limit?: number },
  ): Promise<PostViewDto[]>;
  getTrendingTopics(options?: {
    days?: number;
    limit?: number;
  }): Promise<TrendingTopicDto[]>;
  getSuggestedCreators(
    session: Session | null,
    options?: { limit?: number; query?: string | null },
  ): Promise<CreatorSuggestionDto[]>;
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}|${cursor.id}`,
    "utf8",
  ).toString("base64url");
}

export function decodeFeedCursor(raw: string): FeedCursor {
  let decoded = "";
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw badRequest("Invalid feed cursor.");
  }
  const [iso, id] = decoded.split("|");
  const createdAt = iso ? new Date(iso) : null;
  if (
    !createdAt ||
    Number.isNaN(createdAt.getTime()) ||
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw badRequest("Invalid feed cursor.");
  }
  return { createdAt, id };
}

/** Page size from an untrusted query string; invalid values fall back. */
export function parsePageLimit(
  value: string | number | null | undefined,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return FEED_PAGE_DEFAULT;
  }
  return Math.min(Math.floor(parsed), FEED_PAGE_MAX);
}

/** Defensive re-check of the repository's visibility predicate. */
function visibleTo(record: PostRecord, viewerId: string | null): boolean {
  return (
    record.author.visibility === "public" || record.identityId === viewerId
  );
}

export function toPostView(
  record: PostRecord,
  viewerId: string | null,
): PostViewDto {
  return {
    id: record.id,
    body: record.body,
    mediaUrl: record.mediaUrl,
    mediaAlt: record.mediaAlt,
    createdAt: record.createdAt.toISOString(),
    timeLabel: formatPostTime(record.createdAt),
    topics: record.topics,
    author: {
      username: record.author.username,
      displayName: record.author.displayName,
      avatarUrl: record.author.avatarUrl,
    },
    likeCount: record.likeCount,
    likedByViewer: record.likedByViewer,
    isOwner: record.identityId === viewerId,
  };
}

/**
 * Cloudinary-backed deployments accept post photos only from the signed
 * upload flow's folder; stub/dev deployments keep the https-only contract.
 */
function assertPostMediaUrlAllowed(mediaUrl: string | null): void {
  if (!mediaUrl) return;
  let cloudinaryEnabled = false;
  let cloudName: string | undefined;
  try {
    const env = getEnv();
    cloudinaryEnabled = env.MEDIA_PROVIDER_ADAPTER === "cloudinary";
    cloudName = env.CLOUDINARY_CLOUD_NAME;
  } catch {
    return;
  }
  if (!cloudinaryEnabled) return;
  if (!cloudName || !isCloudinaryPostUrl(mediaUrl, cloudName)) {
    throw badRequest(
      "Post photos must be uploaded through SYNERGY. Please choose the photo again in the composer.",
    );
  }
}

export function createPostsService(repository: PostRepository): PostsService {
  async function pageFor(
    session: Session | null,
    options: { limit?: string | number | null; cursor?: string | null },
    load: (input: {
      viewerId: string | null;
      limit: number;
      cursor: FeedCursor | null;
    }) => ReturnType<PostRepository["listFeed"]>,
  ): Promise<PostPageDto> {
    const viewerId = session?.userId ?? null;
    const limit = parsePageLimit(options.limit);
    const cursor = options.cursor ? decodeFeedCursor(options.cursor) : null;
    const page = await load({ viewerId, limit, cursor });
    const posts = page.posts
      .filter((record) => visibleTo(record, viewerId))
      .map((record) => toPostView(record, viewerId));
    return {
      posts,
      nextCursor: page.nextCursor ? encodeFeedCursor(page.nextCursor) : null,
    };
  }

  return {
    getFeed(session, options = {}) {
      return pageFor(session, options, (input) => repository.listFeed(input));
    },

    getPostsByUsername(session, username, options = {}) {
      return pageFor(session, options, (input) =>
        repository.listByUsername({ ...input, username }),
      );
    },

    async createPost(session, input) {
      const user = requireAuthenticatedUser(session);
      const parsed = postCreateSchema.safeParse(input);
      if (!parsed.success) {
        const fields = [
          ...new Set(
            parsed.error.issues
              .map((issue) => issue.path.join("."))
              .filter(Boolean),
          ),
        ];
        throw badRequest(
          fields.length > 0
            ? `Invalid input in: ${fields.join(", ")}`
            : "Invalid request body.",
        );
      }

      const author: AuthorRecord | null = await repository.findAuthorByIdentity(
        user.userId,
      );
      if (!author) {
        throw forbidden("Create your profile before publishing a post.");
      }

      const mediaUrl =
        parsed.data.mediaUrl && parsed.data.mediaUrl !== ""
          ? parsed.data.mediaUrl
          : null;
      assertPostMediaUrlAllowed(mediaUrl);

      const created = await repository.create({
        identityId: user.userId,
        body: parsed.data.body,
        mediaUrl,
        mediaAlt: mediaUrl ? parsed.data.mediaAlt?.trim() || null : null,
        topics: extractTopics(parsed.data.body),
      });
      if (!created) {
        throw badRequest("The post could not be published. Please try again.");
      }
      return toPostView(created, user.userId);
    },

    async deletePost(session, postId) {
      const user = requireAuthenticatedUser(session);
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          postId,
        )
      ) {
        throw notFound("Post not found.");
      }
      const deleted = await repository.softDelete({
        id: postId,
        identityId: user.userId,
      });
      // Missing, deleted, or someone else's: one answer, so nothing leaks.
      if (!deleted) {
        throw notFound("Post not found.");
      }
    },

    async setLike(session, postId, liked) {
      const user = requireAuthenticatedUser(session);
      const record = await repository.findByIdForViewer({
        id: postId,
        viewerId: user.userId,
      });
      if (!record) {
        throw notFound("Post not found.");
      }
      return repository.setLike({
        postId,
        identityId: user.userId,
        liked,
      });
    },

    async searchPosts(session, options) {
      const viewerId = session?.userId ?? null;
      const limit = Math.min(Math.max(options.limit ?? 10, 1), FEED_PAGE_MAX);
      const records = await repository.search({
        query: options.query ?? "",
        topic: options.topic ?? null,
        viewerId,
        limit,
      });
      return records
        .filter((record) => visibleTo(record, viewerId))
        .map((record) => toPostView(record, viewerId));
    },

    async getTrendingTopics(options = {}) {
      const days = Math.min(Math.max(options.days ?? 30, 1), 365);
      const limit = Math.min(Math.max(options.limit ?? 6, 1), 20);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return repository.trendingTopics({ since, limit });
    },

    async getSuggestedCreators(session, options = {}) {
      const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
      return repository.suggestedCreators({
        viewerId: session?.userId ?? null,
        limit,
        query: options.query?.trim() || undefined,
      });
    },
  };
}
