import "server-only";

import { and, count, eq } from "drizzle-orm";

import { profiles } from "@/modules/profile";
import type { Database } from "@/server/db/client";
import type { ProfileVisibility } from "@synergy/domain";

import { follows } from "./schema";

/**
 * Social-graph persistence boundary (TASK-008D).
 *
 * Every statement is parameterised through Drizzle. The repository never
 * decides authorisation; the service supplies the verified session subject and
 * the target resolved from a public handle. Two writes are deliberately
 * idempotent:
 *
 * - `follow` uses `on conflict do nothing` against the composite primary key,
 *   so a retry after a lost response cannot double-count.
 * - `unfollow` filters on BOTH columns, so there is no delete-by-target-only
 *   path that could remove another member's edge.
 */

export interface FollowTarget {
  identityId: string;
  username: string;
  visibility: ProfileVisibility;
}

export interface SocialGraphRepository {
  /** Resolve a public profile by its already-normalised handle. */
  findTargetByUsername(username: string): Promise<FollowTarget | null>;
  /** Whether the verified caller has a profile (following requires one). */
  findProfileByIdentity(identityId: string): Promise<boolean>;
  isFollowing(input: {
    followerIdentityId: string;
    followingIdentityId: string;
  }): Promise<boolean>;
  follow(input: {
    followerIdentityId: string;
    followingIdentityId: string;
  }): Promise<void>;
  unfollow(input: {
    followerIdentityId: string;
    followingIdentityId: string;
  }): Promise<void>;
  countsFor(identityId: string): Promise<{
    followerCount: number;
    followingCount: number;
  }>;
}

export function createDrizzleSocialGraphRepository(
  db: Database,
): SocialGraphRepository {
  return {
    async findTargetByUsername(username) {
      const rows = await db
        .select({
          identityId: profiles.identityId,
          username: profiles.username,
          visibility: profiles.visibility,
        })
        .from(profiles)
        .where(eq(profiles.username, username))
        .limit(1);
      return rows[0] ?? null;
    },

    async findProfileByIdentity(identityId) {
      const rows = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.identityId, identityId))
        .limit(1);
      return rows.length > 0;
    },

    async isFollowing({ followerIdentityId, followingIdentityId }) {
      const rows = await db
        .select({ followerIdentityId: follows.followerIdentityId })
        .from(follows)
        .where(
          and(
            eq(follows.followerIdentityId, followerIdentityId),
            eq(follows.followingIdentityId, followingIdentityId),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    async follow({ followerIdentityId, followingIdentityId }) {
      await db
        .insert(follows)
        .values({ followerIdentityId, followingIdentityId })
        .onConflictDoNothing();
    },

    async unfollow({ followerIdentityId, followingIdentityId }) {
      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerIdentityId, followerIdentityId),
            eq(follows.followingIdentityId, followingIdentityId),
          ),
        );
    },

    async countsFor(identityId) {
      // Two indexed aggregates. We never load follower rows to count them.
      const [followers] = await db
        .select({ value: count() })
        .from(follows)
        .where(eq(follows.followingIdentityId, identityId));
      const [following] = await db
        .select({ value: count() })
        .from(follows)
        .where(eq(follows.followerIdentityId, identityId));
      return {
        followerCount: Number(followers?.value ?? 0),
        followingCount: Number(following?.value ?? 0),
      };
    },
  };
}
