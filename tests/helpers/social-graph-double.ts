import type {
  FollowTarget,
  SocialGraphRepository,
} from "@/modules/social-graph/repository";
import type { ProfileVisibility } from "@synergy/domain";

/**
 * In-memory social-graph repository — a TEST DOUBLE.
 *
 * It mirrors the real repository's contract, including idempotent follow and
 * exact-pair unfollow, so the service tests exercise the same decisions the SQL
 * enforces. Live Neon behaviour is proved separately by
 * `scripts/follows-live-check.mjs`.
 */

const keyOf = (followerId: string, followingId: string) =>
  `${followerId}|${followingId}`;

export interface InMemorySocialGraphRepository extends SocialGraphRepository {
  edges: Set<string>;
  profiles: Set<string>;
  edgeCount(followerId: string, followingId: string): number;
}

export function createInMemorySocialGraphRepository(
  seed: {
    targets?: Array<{
      identityId: string;
      username: string;
      visibility?: ProfileVisibility;
    }>;
    /** Identity ids that have a profile (targets are included by default). */
    profiles?: string[];
    edges?: Array<[followerId: string, followingId: string]>;
  } = {},
): InMemorySocialGraphRepository {
  const targets = new Map<string, FollowTarget>(
    (seed.targets ?? []).map((entry) => [
      entry.username,
      {
        identityId: entry.identityId,
        username: entry.username,
        visibility: entry.visibility ?? "public",
      },
    ]),
  );
  const profiles = new Set<string>(
    seed.profiles ?? [...targets.values()].map((target) => target.identityId),
  );
  const edges = new Set<string>(
    (seed.edges ?? []).map(([follower, following]) =>
      keyOf(follower, following),
    ),
  );

  return {
    edges,
    profiles,
    edgeCount(followerId, followingId) {
      return edges.has(keyOf(followerId, followingId)) ? 1 : 0;
    },

    async findTargetByUsername(username) {
      return targets.get(username) ?? null;
    },

    async findProfileByIdentity(identityId) {
      return profiles.has(identityId);
    },

    async isFollowing({ followerIdentityId, followingIdentityId }) {
      return edges.has(keyOf(followerIdentityId, followingIdentityId));
    },

    async follow({ followerIdentityId, followingIdentityId }) {
      edges.add(keyOf(followerIdentityId, followingIdentityId));
    },

    async unfollow({ followerIdentityId, followingIdentityId }) {
      edges.delete(keyOf(followerIdentityId, followingIdentityId));
    },

    async countsFor(identityId) {
      let followerCount = 0;
      let followingCount = 0;
      for (const edge of edges) {
        const [follower, following] = edge.split("|");
        if (following === identityId) followerCount += 1;
        if (follower === identityId) followingCount += 1;
      }
      return { followerCount, followingCount };
    },
  };
}
