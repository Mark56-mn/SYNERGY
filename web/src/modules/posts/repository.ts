import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { profiles } from "@/modules/profile";
import type { Database } from "@/server/db/client";
import type { ProfileVisibility } from "@synergy/domain";

import { postLikes, postTopics, posts } from "./schema";

/**
 * Publishing persistence boundary (TASK-008A).
 *
 * Every feed/discovery read applies the SAME two rules in SQL:
 *
 *   isNull(posts.deletedAt)                   — deleted posts disappear
 *   profiles.visibility = 'public' OR author  — a private profile's posts are
 *                                               only ever selected for its owner
 *
 * Enforcing entitlement in the query — not after the page is fetched — means a
 * private author's post cannot leak through pagination, counts or discovery.
 * Likes are counted only for posts already selected, so they cannot be used as
 * an existence oracle either.
 */

export interface AuthorRecord {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  visibility: ProfileVisibility;
}

export interface PostRecord {
  id: string;
  identityId: string;
  body: string;
  mediaUrl: string | null;
  mediaAlt: string | null;
  createdAt: Date;
  topics: string[];
  author: AuthorRecord;
  likeCount: number;
  likedByViewer: boolean;
}

export interface FeedCursor {
  createdAt: Date;
  id: string;
}

export interface PostPage {
  posts: PostRecord[];
  nextCursor: FeedCursor | null;
}

export interface CreatePostInput {
  identityId: string;
  body: string;
  mediaUrl: string | null;
  mediaAlt: string | null;
  topics: string[];
}

export interface SearchPostsInput {
  query: string;
  topic?: string | null;
  viewerId: string | null;
  limit: number;
}

export interface CreatorSuggestion {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  postCount: number;
}

export interface PostRepository {
  listFeed(input: {
    viewerId: string | null;
    limit: number;
    cursor?: FeedCursor | null;
  }): Promise<PostPage>;
  listByUsername(input: {
    username: string;
    viewerId: string | null;
    limit: number;
    cursor?: FeedCursor | null;
  }): Promise<PostPage>;
  findByIdForViewer(input: {
    id: string;
    viewerId: string | null;
  }): Promise<PostRecord | null>;
  findAuthorByIdentity(identityId: string): Promise<AuthorRecord | null>;
  create(input: CreatePostInput): Promise<PostRecord | null>;
  softDelete(input: { id: string; identityId: string }): Promise<boolean>;
  setLike(input: {
    postId: string;
    identityId: string;
    liked: boolean;
  }): Promise<{ likeCount: number; liked: boolean }>;
  search(input: SearchPostsInput): Promise<PostRecord[]>;
  trendingTopics(input: {
    since: Date;
    limit: number;
  }): Promise<Array<{ topic: string; postCount: number }>>;
  suggestedCreators(input: {
    viewerId: string | null;
    limit: number;
    query?: string;
  }): Promise<CreatorSuggestion[]>;
}

/** Selection that joins the author profile onto a post (read-only). */
const postSelection = {
  id: posts.id,
  identityId: posts.identityId,
  body: posts.body,
  mediaUrl: posts.mediaUrl,
  mediaAlt: posts.mediaAlt,
  createdAt: posts.createdAt,
  authorUsername: profiles.username,
  authorDisplayName: profiles.displayName,
  authorAvatarUrl: profiles.avatarUrl,
  authorVisibility: profiles.visibility,
} as const;

type PostRowWithAuthor = {
  id: string;
  identityId: string;
  body: string;
  mediaUrl: string | null;
  mediaAlt: string | null;
  createdAt: Date;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  authorVisibility: ProfileVisibility;
};

/**
 * Escape LIKE metacharacters so `%` or `_` typed into search is a literal
 * character rather than a wildcard (search must not become a table scan).
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function createDrizzlePostRepository(db: Database): PostRepository {
  /** Who may see a post: public authors, plus the viewer's own posts. */
  function entitlement(viewerId: string | null): SQL {
    const publicAuthors = eq(profiles.visibility, "public");
    if (!viewerId) {
      return publicAuthors;
    }
    return or(publicAuthors, eq(posts.identityId, viewerId))!;
  }

  function before(cursor: FeedCursor): SQL {
    return or(
      lt(posts.createdAt, cursor.createdAt),
      and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id)),
    )!;
  }

  /** Attach topics, like counts and the viewer's own like in three queries. */
  async function hydrate(
    rows: PostRowWithAuthor[],
    viewerId: string | null,
  ): Promise<PostRecord[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);

    const topicRows = await db
      .select({ postId: postTopics.postId, topic: postTopics.topic })
      .from(postTopics)
      .where(inArray(postTopics.postId, ids));
    const likeRows = await db
      .select({ postId: postLikes.postId, value: count() })
      .from(postLikes)
      .where(inArray(postLikes.postId, ids))
      .groupBy(postLikes.postId);
    const likedRows = viewerId
      ? await db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(
            and(
              inArray(postLikes.postId, ids),
              eq(postLikes.identityId, viewerId),
            ),
          )
      : [];

    const topicsByPost = new Map<string, string[]>();
    for (const row of topicRows) {
      const list = topicsByPost.get(row.postId) ?? [];
      list.push(row.topic);
      topicsByPost.set(row.postId, list);
    }
    const likesByPost = new Map<string, number>(
      likeRows.map((row) => [row.postId, Number(row.value)]),
    );
    const likedByViewer = new Set(likedRows.map((row) => row.postId));

    return rows.map((row) => ({
      id: row.id,
      identityId: row.identityId,
      body: row.body,
      mediaUrl: row.mediaUrl,
      mediaAlt: row.mediaAlt,
      createdAt: row.createdAt,
      topics: (topicsByPost.get(row.id) ?? []).sort(),
      author: {
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: row.authorAvatarUrl,
        visibility: row.authorVisibility,
      },
      likeCount: likesByPost.get(row.id) ?? 0,
      likedByViewer: likedByViewer.has(row.id),
    }));
  }

  async function pageOf(
    rows: PostRowWithAuthor[],
    limit: number,
    viewerId: string | null,
  ): Promise<PostPage> {
    const hasMore = rows.length > limit;
    const visible = hasMore ? rows.slice(0, limit) : rows;
    const last = visible.at(-1);
    return {
      posts: await hydrate(visible, viewerId),
      nextCursor:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }

  return {
    async listFeed({ viewerId, limit, cursor }) {
      const rows = await db
        .select(postSelection)
        .from(posts)
        .innerJoin(profiles, eq(profiles.identityId, posts.identityId))
        .where(
          and(
            isNull(posts.deletedAt),
            entitlement(viewerId),
            cursor ? before(cursor) : undefined,
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit + 1);
      return pageOf(rows, limit, viewerId);
    },

    async listByUsername({ username, viewerId, limit, cursor }) {
      const rows = await db
        .select(postSelection)
        .from(posts)
        .innerJoin(profiles, eq(profiles.identityId, posts.identityId))
        .where(
          and(
            isNull(posts.deletedAt),
            eq(profiles.username, username),
            entitlement(viewerId),
            cursor ? before(cursor) : undefined,
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit + 1);
      return pageOf(rows, limit, viewerId);
    },

    async findByIdForViewer({ id, viewerId }) {
      const rows = await db
        .select(postSelection)
        .from(posts)
        .innerJoin(profiles, eq(profiles.identityId, posts.identityId))
        .where(
          and(eq(posts.id, id), isNull(posts.deletedAt), entitlement(viewerId)),
        )
        .limit(1);
      const hydrated = await hydrate(rows, viewerId);
      return hydrated[0] ?? null;
    },

    async findAuthorByIdentity(identityId) {
      const rows = await db
        .select({
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          visibility: profiles.visibility,
        })
        .from(profiles)
        .where(eq(profiles.identityId, identityId))
        .limit(1);
      return rows[0] ?? null;
    },

    async create(input) {
      const inserted = await db
        .insert(posts)
        .values({
          identityId: input.identityId,
          body: input.body,
          mediaUrl: input.mediaUrl,
          mediaAlt: input.mediaAlt,
        })
        .returning({ id: posts.id });
      const id = inserted[0]?.id;
      if (!id) return null;

      if (input.topics.length > 0) {
        await db
          .insert(postTopics)
          .values(input.topics.map((topic) => ({ postId: id, topic })))
          .onConflictDoNothing();
      }

      return this.findByIdForViewer({ id, viewerId: input.identityId });
    },

    async softDelete({ id, identityId }) {
      // The WHERE clause is the verified author, never a body-supplied id.
      const deleted = await db
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(posts.id, id),
            eq(posts.identityId, identityId),
            isNull(posts.deletedAt),
          ),
        )
        .returning({ id: posts.id });
      return deleted.length > 0;
    },

    async setLike({ postId, identityId, liked }) {
      if (liked) {
        await db
          .insert(postLikes)
          .values({ postId, identityId })
          .onConflictDoNothing();
      } else {
        await db
          .delete(postLikes)
          .where(
            and(
              eq(postLikes.postId, postId),
              eq(postLikes.identityId, identityId),
            ),
          );
      }
      const counted = await db
        .select({ value: count() })
        .from(postLikes)
        .where(eq(postLikes.postId, postId));
      return { likeCount: Number(counted[0]?.value ?? 0), liked };
    },

    async search({ query, topic, viewerId, limit }) {
      const conditions: Array<SQL | undefined> = [
        isNull(posts.deletedAt),
        entitlement(viewerId),
      ];
      const needle = query.trim();
      if (needle) {
        const pattern = `%${escapeLikePattern(needle)}%`;
        conditions.push(
          or(
            ilike(posts.body, pattern),
            ilike(profiles.username, pattern),
            ilike(profiles.displayName, pattern),
          ),
        );
      }
      if (topic) {
        conditions.push(
          sql`exists (select 1 from ${postTopics} where ${postTopics.postId} = ${posts.id} and ${postTopics.topic} = ${topic})`,
        );
      }
      const rows = await db
        .select(postSelection)
        .from(posts)
        .innerJoin(profiles, eq(profiles.identityId, posts.identityId))
        .where(and(...conditions))
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(limit);
      return hydrate(rows, viewerId);
    },

    async trendingTopics({ since, limit }) {
      const rows = await db
        .select({ topic: postTopics.topic, value: count() })
        .from(postTopics)
        .innerJoin(posts, eq(posts.id, postTopics.postId))
        .innerJoin(profiles, eq(profiles.identityId, posts.identityId))
        .where(
          and(
            isNull(posts.deletedAt),
            eq(profiles.visibility, "public"),
            gte(posts.createdAt, since),
          ),
        )
        .groupBy(postTopics.topic)
        .orderBy(desc(sql`count(*)`), postTopics.topic)
        .limit(limit);
      return rows.map((row) => ({
        topic: row.topic,
        postCount: Number(row.value),
      }));
    },
    async suggestedCreators({ viewerId, limit, query }) {
      const conditions: Array<SQL | undefined> = [
        eq(profiles.visibility, "public"),
        viewerId ? sql`${profiles.identityId} <> ${viewerId}` : undefined,
      ];
      const needle = query?.trim();
      if (needle) {
        const pattern = `%${escapeLikePattern(needle)}%`;
        conditions.push(
          or(
            ilike(profiles.username, pattern),
            ilike(profiles.displayName, pattern),
          ),
        );
      }
      const rows = await db
        .select({
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          bio: profiles.bio,
          value: count(posts.id),
        })
        .from(profiles)
        .leftJoin(
          posts,
          and(
            eq(posts.identityId, profiles.identityId),
            isNull(posts.deletedAt),
          ),
        )
        .where(and(...conditions))
        .groupBy(
          profiles.username,
          profiles.displayName,
          profiles.avatarUrl,
          profiles.bio,
        )
        .orderBy(desc(sql`count(${posts.id})`), profiles.username)
        .limit(limit);
      return rows.map((row) => ({
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        bio: row.bio,
        postCount: Number(row.value),
      }));
    },
  };
}
