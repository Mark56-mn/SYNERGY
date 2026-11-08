import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Member profile schema (TASK-007) — the FIRST real table in this product.
 *
 * Design notes that the migration cannot express in comments:
 *
 * - `identity_id` is the Supabase Auth user id, and it is the ONLY link to an
 *   account. There is no password column, no email column and no duplicate
 *   credential store: Supabase Auth stays the identity authority (ADR-0003).
 * - Both `identity_id` and `username` carry database-level UNIQUE indexes. The
 *   application also preflights availability for a friendly message, but the
 *   database is the authority — concurrent onboarding requests cannot create two
 *   profiles for one account, or two accounts with one handle.
 * - `username` is stored already normalised (lowercase, `[a-z0-9_]`, 3–30).
 *   The CHECK constraint is the last line of defence if a code path ever
 *   forgets to normalise.
 * - The visibility vocabulary is `public` | `private` only. A follower-scoped
 *   value would be a privacy promise the server cannot keep before a follow
 *   graph exists, so it is deliberately absent.
 * - Deleting a Supabase Auth user does not cascade here (the auth schema is a
 *   different system); account deletion/erasure is a later, explicitly approved
 *   task. The rows are small and contain no special-category data.
 */
export const profileVisibilityEnum = pgEnum("profile_visibility", [
  "public",
  "private",
]);

export const profiles = pgTable(
  "profiles",
  {
    /** Stable internal profile id. Never used as an authorization key. */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Supabase Auth subject (UUID). The verified identity this profile belongs to. */
    identityId: uuid("identity_id").notNull(),
    username: varchar("username", { length: 30 }).notNull(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    bio: varchar("bio", { length: 280 }),
    /** URL only in this slice — no upload/storage integration. */
    avatarUrl: text("avatar_url"),
    visibility: profileVisibilityEnum("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    /** One profile per verified identity — makes onboarding idempotent. */
    identityIdUnique: uniqueIndex("profiles_identity_id_key").on(
      table.identityId,
    ),
    /** One account per public handle — resolved by the public profile route. */
    usernameUnique: uniqueIndex("profiles_username_key").on(table.username),
    /** Reject anything that is not the canonical stored handle shape. */
    usernameFormat: check(
      "profiles_username_format",
      sql`${table.username} ~ '^[a-z0-9_]{3,30}$'`,
    ),
    displayNameNotBlank: check(
      "profiles_display_name_not_blank",
      sql`char_length(btrim(${table.displayName})) between 1 and 80`,
    ),
    bioLength: check(
      "profiles_bio_length",
      sql`${table.bio} is null or char_length(${table.bio}) <= 280`,
    ),
    avatarUrlLength: check(
      "profiles_avatar_url_length",
      sql`${table.avatarUrl} is null or char_length(${table.avatarUrl}) <= 2048`,
    ),
    /** Cheap support for the public lookup path. */
    visibilityIndex: index("profiles_visibility_idx").on(table.visibility),
  }),
);

export type ProfileRow = typeof profiles.$inferSelect;
export type ProfileInsert = typeof profiles.$inferInsert;
