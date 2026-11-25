import { z } from "zod";

/**
 * Social graph boundary (TASK-008D) — contract shapes only.
 *
 * - A follow is an accepted relationship; there are no pending states.
 * - The following feed is a user-selected chronological view, never a ranking
 *   promise.
 * - `FollowStateDto` is an explicit allowlist: it deliberately carries no auth
 *   subject, profile id, username, edge timestamp or visibility flag, so a
 *   follow response cannot become a directory/enumeration surface.
 *
 * The package stays free of server/framework imports so the Android app can
 * consume the same contract.
 */

export const FEED_SCOPE_DEFAULT = "for-you";
export const feedScopeSchema = z.enum(["for-you", "following"]);
export type FeedScope = z.infer<typeof feedScopeSchema>;

export interface FollowStateDto {
  isFollowing: boolean;
  /**
   * Aggregate count for the target profile. `null` means the count is not
   * visible to this viewer (e.g. a creator who became private after the viewer
   * followed them): the value is deliberately suppressed rather than fabricated
   * as `0`. Public profiles always return a real non-negative integer.
   */
  followerCount: number | null;
  /** See `followerCount`. */
  followingCount: number | null;
}
