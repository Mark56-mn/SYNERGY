import { randomUUID } from "node:crypto";

import type {
  AuthorRecord,
  CreatePostInput,
  CreatorSuggestion,
  FeedCursor,
  PostPage,
  PostRecord,
  PostRepository,
  SearchPostsInput,
} from "@/modules/posts/repository";
import type { ProfileVisibility } from "@synergy/domain";

/**
 * In-memory publishing repository — a TEST DOUBLE.
 *
 * It mirrors the real repository's visible contract, most importantly the
 * visibility predicate (`author.visibility === "public" || author is the
 * viewer`), so service tests exercise the same entitlement rule that the SQL
 * enforces. Live Neon behaviour is proved separately by
 * `scripts/posts-live-check.mjs`; these tests prove the service's decisions.
 */

export function makePost(
  overrides: Partial<PostRecord> & {
    identityId: string;
    author: AuthorRecord;
  },
): PostRecord {
  return {
    id: overrides.id ?? randomUUID(),
    identityId: overrides.identityId,
    body: overrides.body ?? "A test post",
    mediaUrl: overrides.mediaUrl ?? null,
    mediaAlt: overrides.mediaAlt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    topics: overrides.topics ?? [],
    author: overrides.author,
    likeCount: overrides.likeCount ?? 0,
    likedByViewer: overrides.likedByViewer ?? false,
  };
}

export function makeAuthor(overrides: {
  username: string;
  displayName?: string;
  visibility?: ProfileVisibility;
  avatarUrl?: string | null;
}): AuthorRecord {
  return {
    username: overrides.username,
    displayName: overrides.displayName ?? "Test Member",
    avatarUrl: overrides.avatarUrl ?? null,
    visibility: overrides.visibility ?? "public",
  };
}

export interface InMemoryPostRepository extends PostRepository {
  rows: PostRecord[];
  likes: Map<string, Set<string>>;
  authors: Map<string, AuthorRecord>;
}

function visible(record: PostRecord, viewerId: string | null): boolean {
  return (
    record.author.visibility === "public" || record.identityId === viewerId
  );
}

export function createInMemoryPostRepository(
  seed: {
    posts?: PostRecord[];
    authors?: Array<{ identityId: string; author: AuthorRecord }>;
  } = {},
): InMemoryPostRepository {
  const rows = [...(seed.posts ?? [])];
  const likes = new Map<string, Set<string>>();
  const authors = new Map<string, AuthorRecord>(
    (seed.authors ?? []).map((entry) => [entry.identityId, entry.author]),
  );

  function page(
    list: PostRecord[],
    limit: number,
    viewerId: string | null,
    cursor?: FeedCursor | null,
  ): PostPage {
    const sorted = [...list].sort((a, b) => {
      const byDate = b.createdAt.getTime() - a.createdAt.getTime();
      return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
    });
    const filtered = cursor
      ? sorted.filter(
          (record) =>
            record.createdAt < cursor.createdAt ||
            (record.createdAt.getTime() === cursor.createdAt.getTime() &&
              record.id < cursor.id),
        )
      : sorted;
    const visibleRows = filtered.slice(0, limit + 1);
    const hasMore = visibleRows.length > limit;
    const kept = hasMore ? visibleRows.slice(0, limit) : visibleRows;
    const last = kept.at(-1);
    return {
      posts: kept.map((record) => {
        const likers = likes.get(record.id);
        return {
          ...record,
          likeCount: likers?.size ?? 0,
          likedByViewer: viewerId ? Boolean(likers?.has(viewerId)) : false,
        };
      }),
      nextCursor:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }

  return {
    rows,
    likes,
    authors,

    async listFeed({ viewerId, limit, cursor }) {
      return page(
        rows.filter((record) => visible(record, viewerId)),
        limit,
        viewerId,
        cursor,
      );
    },

    async listByUsername({ username, viewerId, limit, cursor }) {
      return page(
        rows.filter(
          (record) =>
            record.author.username === username && visible(record, viewerId),
        ),
        limit,
        viewerId,
        cursor,
      );
    },

    async findByIdForViewer({ id, viewerId }) {
      const record = rows.find(
        (candidate) => candidate.id === id && visible(candidate, viewerId),
      );
      if (!record) return null;
      const likers = likes.get(record.id);
      return {
        ...record,
        likeCount: likers?.size ?? 0,
        likedByViewer: viewerId ? Boolean(likers?.has(viewerId)) : false,
      };
    },

    async findAuthorByIdentity(identityId) {
      return authors.get(identityId) ?? null;
    },

    async create(input: CreatePostInput) {
      const author = authors.get(input.identityId);
      if (!author) return null;
      const record = makePost({
        identityId: input.identityId,
        author,
        body: input.body,
        mediaUrl: input.mediaUrl,
        mediaAlt: input.mediaAlt,
        topics: input.topics,
        createdAt: new Date(),
      });
      rows.push(record);
      return record;
    },

    async softDelete({ id, identityId }) {
      const index = rows.findIndex(
        (record) => record.id === id && record.identityId === identityId,
      );
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },

    async setLike({ postId, identityId, liked }) {
      const likers = likes.get(postId) ?? new Set<string>();
      if (liked) likers.add(identityId);
      else likers.delete(identityId);
      likes.set(postId, likers);
      return { likeCount: likers.size, liked };
    },

    async search({ query, topic, viewerId, limit }: SearchPostsInput) {
      const needle = query.trim().toLowerCase();
      return rows
        .filter((record) => visible(record, viewerId))
        .filter((record) =>
          needle
            ? record.body.toLowerCase().includes(needle) ||
              record.author.username.includes(needle) ||
              record.author.displayName.toLowerCase().includes(needle)
            : true,
        )
        .filter((record) => (topic ? record.topics.includes(topic) : true))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
        .map((record) => ({
          ...record,
          likeCount: likes.get(record.id)?.size ?? 0,
          likedByViewer: viewerId
            ? Boolean(likes.get(record.id)?.has(viewerId))
            : false,
        }));
    },

    async trendingTopics({ since, limit }) {
      const counts = new Map<string, number>();
      for (const record of rows) {
        if (record.createdAt < since) continue;
        if (record.author.visibility !== "public") continue;
        for (const topic of record.topics) {
          counts.set(topic, (counts.get(topic) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([topic, postCount]) => ({ topic, postCount }))
        .sort(
          (a, b) => b.postCount - a.postCount || a.topic.localeCompare(b.topic),
        )
        .slice(0, limit);
    },

    async suggestedCreators({ viewerId, limit }): Promise<CreatorSuggestion[]> {
      return [...authors.entries()]
        .filter(([identityId, author]) => {
          if (author.visibility !== "public") return false;
          return identityId !== viewerId;
        })
        .map(([identityId, author]) => ({
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          bio: null,
          postCount: rows.filter((record) => record.identityId === identityId)
            .length,
        }))
        .sort(
          (a, b) =>
            b.postCount - a.postCount || a.username.localeCompare(b.username),
        )
        .slice(0, limit);
    },
  };
}
