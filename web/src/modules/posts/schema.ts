import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Social publishing schema (TASK-008A).
 *
 * Design notes the migration cannot express:
 *
 * - `identity_id` is the Supabase Auth subject, exactly like `profiles`. There
 *   is no separate author table and no FK across module schemas: the service
 *   refuses to publish for an account without a profile, and the feed JOINs
 *   `profiles` to read the author and enforce profile visibility in the same
 *   statement that selects posts. A private profile's posts are therefore never
 *   selected for a non-owner — not filtered afterwards in the UI.
 * - `deleted_at` is a soft delete. Likes and topics reference the post row, and
 *   a hard delete would destroy engagement history; every read path filters
 *   `deleted_at is null`.
 * - Topics are derived from `#hashtags` at publish time, lowercased and capped.
 *   They are stored separately so discovery never scans captions for ranking.
 * - `post_likes` has a composite primary key, which is the database-level
 *   guarantee against double-liking and against duplicate counts.
 * - Media is a single image URL (text/image-first MVP). The CHECK repeats the
 *   https-only rule; the Cloudinary folder restriction is enforced server-side
 *   when the Cloudinary adapter is configured.
 */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Verified Supabase Auth subject of the author. */
    identityId: uuid("identity_id").notNull(),
    body: varchar("body", { length: 1000 }).notNull(),
    mediaUrl: text("media_url"),
    mediaAlt: varchar("media_alt", { length: 280 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    /** Newest-first feed scan. */
    feedIndex: index("posts_feed_idx").on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    /** Author timeline (profile "Posts" tab). */
    authorIndex: index("posts_identity_created_idx").on(
      table.identityId,
      table.createdAt.desc(),
    ),
    /** Whitespace-only captions are rejected by the database too. */
    bodyLength: check(
      "posts_body_length",
      sql`char_length(btrim(${table.body})) between 1 and 1000`,
    ),
    mediaUrlShape: check(
      "posts_media_url_shape",
      sql`${table.mediaUrl} is null or (${table.mediaUrl} ~ '^https://' and char_length(${table.mediaUrl}) <= 2048)`,
    ),
    mediaAltLength: check(
      "posts_media_alt_length",
      sql`${table.mediaAlt} is null or char_length(${table.mediaAlt}) <= 280`,
    ),
  }),
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    identityId: uuid("identity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** One like per member per post — enforced by the database. */
    pk: primaryKey({ columns: [table.postId, table.identityId] }),
    likedByIndex: index("post_likes_identity_idx").on(table.identityId),
  }),
);

export const postTopics = pgTable(
  "post_topics",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.topic] }),
    topicIndex: index("post_topics_topic_idx").on(table.topic),
    topicShape: check(
      "post_topics_topic_shape",
      sql`${table.topic} ~ '^[a-z0-9_]{2,40}$'`,
    ),
  }),
);

export type PostRow = typeof posts.$inferSelect;
export type PostInsert = typeof posts.$inferInsert;
