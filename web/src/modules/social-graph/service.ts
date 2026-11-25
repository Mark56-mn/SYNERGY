import "server-only";

import { usernameInputSchema, type FollowStateDto } from "@synergy/domain";

import type { Session } from "@/server/auth/session";
import { requireAuthenticatedUser } from "@/server/authz";
import { badRequest, forbidden, notFound } from "@/server/http/errors";

import type { FollowTarget, SocialGraphRepository } from "./repository";

/**
 * Social-graph service — the ONE place that decides who may follow whom.
 *
 * Security properties (proved by `tests/social-graph-service.test.ts`):
 *
 * 1. The acting identity ALWAYS comes from a verified `Session`. No method
 *    accepts a follower/target id from request data, so there is no IDOR or
 *    mass-assignment path.
 * 2. A private or absent target is answered as the same `404` ("Profile not
 *    found."). "Private" never becomes an existence oracle.
 * 3. A follow is one `INSERT ... ON CONFLICT DO NOTHING` and an unfollow is a
 *    delete of the exact pair, so retries are idempotent and a caller can never
 *    remove another member's edge.
 * 4. Counts are read back from the database after every mutation; the service
 *    never guesses an increment.
 * 5. The response DTO is a three-field allowlist. The auth subject, internal
 *    profile id and edge rows never leave this layer.
 */

export interface SocialGraphService {
  /**
   * Current relationship + counts for the target profile. Returns `null` when
   * the handle is invalid, absent, or private to a non-owner viewer.
   */
  getFollowState(
    session: Session | null,
    username: string,
  ): Promise<FollowStateDto | null>;
  follow(session: Session | null, username: string): Promise<FollowStateDto>;
  unfollow(session: Session | null, username: string): Promise<FollowStateDto>;
}

/** Normalise a handle; invalid input is answered exactly like a missing one. */
function normaliseHandle(raw: string): string | null {
  const parsed = usernameInputSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function createSocialGraphService(
  repository: SocialGraphRepository,
): SocialGraphService {
  async function stateFor(
    target: FollowTarget,
    viewerId: string | null,
  ): Promise<FollowStateDto> {
    const counts = await repository.countsFor(target.identityId);
    const isFollowing =
      viewerId !== null && viewerId !== target.identityId
        ? await repository.isFollowing({
            followerIdentityId: viewerId,
            followingIdentityId: target.identityId,
          })
        : false;
    return {
      isFollowing,
      followerCount: counts.followerCount,
      followingCount: counts.followingCount,
    };
  }

  /**
   * Resolve a target for a mutation. Absent profiles always share one `404`.
   *
   * Follows require a PUBLIC target (a private account cannot be followed).
   * Unfollows are allowed to resolve a private target so a member can remove a
   * follow edge they created while the creator was still public — but the edge
   * must already exist (see `unfollow`), otherwise the same `404` is returned so
   * a private profile stays indistinguishable from an absent one.
   */
  async function resolveForMutation(
    viewerId: string,
    rawUsername: string,
    options: { requirePublic: boolean },
  ): Promise<FollowTarget> {
    const username = normaliseHandle(rawUsername);
    if (!username) {
      throw notFound("Profile not found.");
    }
    const target = await repository.findTargetByUsername(username);
    if (!target) {
      throw notFound("Profile not found.");
    }
    if (target.identityId === viewerId) {
      throw badRequest("You cannot follow yourself.");
    }
    if (options.requirePublic && target.visibility !== "public") {
      throw notFound("Profile not found.");
    }
    const hasProfile = await repository.findProfileByIdentity(viewerId);
    if (!hasProfile) {
      throw forbidden("Create your profile before following creators.");
    }
    return target;
  }

  return {
    async getFollowState(session, username) {
      const normalised = normaliseHandle(username);
      if (!normalised) {
        return null;
      }
      const target = await repository.findTargetByUsername(normalised);
      if (!target) {
        return null;
      }
      const viewerId = session?.userId ?? null;
      const isOwner = viewerId !== null && viewerId === target.identityId;
      if (!isOwner && target.visibility !== "public") {
        // Private profiles are indistinguishable from absent ones.
        return null;
      }
      return stateFor(target, viewerId);
    },

    async follow(session, username) {
      const user = requireAuthenticatedUser(session);
      const target = await resolveForMutation(user.userId, username, {
        requirePublic: true,
      });
      await repository.follow({
        followerIdentityId: user.userId,
        followingIdentityId: target.identityId,
      });
      return stateFor(target, user.userId);
    },

    async unfollow(session, username) {
      const user = requireAuthenticatedUser(session);
      const target = await resolveForMutation(user.userId, username, {
        requirePublic: false,
      });
      // Privacy: a private profile is indistinguishable from an absent one for
      // anyone who does not already follow it. An existing edge is the proof of
      // a prior public relationship, so only then may it be removed. This keeps
      // unfollow from becoming an existence oracle for private profiles.
      const isPrivate = target.visibility !== "public";
      if (isPrivate) {
        const alreadyFollowing = await repository.isFollowing({
          followerIdentityId: user.userId,
          followingIdentityId: target.identityId,
        });
        if (!alreadyFollowing) {
          throw notFound("Profile not found.");
        }
      }
      await repository.unfollow({
        followerIdentityId: user.userId,
        followingIdentityId: target.identityId,
      });
      if (isPrivate) {
        // The creator is now private: their aggregate counts are not visible to
        // this (former) follower, so suppress them instead of fabricating `0`.
        return {
          isFollowing: false,
          followerCount: null,
          followingCount: null,
        };
      }
      return stateFor(target, user.userId);
    },
  };
}
