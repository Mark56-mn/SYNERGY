import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Creator follow graph schema (TASK-008D).
 *
 * Design notes the migration cannot express:
 *
 * - `follower_identity_id` is ALWAYS the verified Supabase Auth subject of the
 *   caller. It is never accepted from a request body or query string, so there
 *   is no IDOR path that could create an edge on another member's behalf.
 * - `following_identity_id` is the target profile's `identity_id`, resolved
 *   server-side from a normalised public username. The client never names an
 *   identity id.
 * - The composite primary key is the database-level guarantee against duplicate
 *   follows and double counts; `on conflict do nothing` makes retries safe.
 * - The CHECK is the last line of defence against a self-edge if a future
 *   service path regresses.
 * - No cross-module FK to `profiles.identity_id`, matching the TASK-008A
 *   convention (posts deliberately avoid cross-module FKs too). Account
 *   deletion/orphan cleanup belongs to a later erasure task; this table does
 *   not pretend to cascade.
 * - A profile that becomes private keeps its follow rows. Every read path JOINs
 *   `profiles` and applies visibility, so a stale edge cannot leak content. If
 *   the creator returns to public, the existing edge applies again.
 */

export const follows = pgTable(
  "follows",
  {
    followerIdentityId: uuid("follower_identity_id").notNull(),
    followingIdentityId: uuid("following_identity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** One relationship per ordered pair — duplicate follows cannot count twice. */
    pk: primaryKey({
      columns: [table.followerIdentityId, table.followingIdentityId],
    }),
    /** A member can never follow themselves, even outside the service layer. */
    noSelf: check(
      "follows_no_self",
      sql`${table.followerIdentityId} <> ${table.followingIdentityId}`,
    ),
    /** Follower-count lookups for a profile. */
    followingCreatedIndex: index("follows_following_created_idx").on(
      table.followingIdentityId,
      table.createdAt.desc(),
    ),
    /** Following-count and Following-feed lookups for the viewer. */
    followerCreatedIndex: index("follows_follower_created_idx").on(
      table.followerIdentityId,
      table.createdAt.desc(),
    ),
  }),
);

export type FollowRow = typeof follows.$inferSelect;
export type FollowInsert = typeof follows.$inferInsert;
