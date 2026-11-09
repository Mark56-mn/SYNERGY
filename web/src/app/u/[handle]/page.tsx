import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MemberProfileView } from "@/components/profile/MemberProfileView";
import { ProfileView } from "@/components/profile/ProfileView";
import { getAuthor } from "@/lib/demo-content";
import { getPostsService } from "@/modules/posts/provider";
import { getProfileService } from "@/modules/profile/provider";
import {
  toOwnerProfileDto,
  toPublicProfileDto,
  type OwnerProfileDto,
  type PublicProfileDto,
} from "@/modules/profile/service";
import type { PostViewDto } from "@synergy/domain";
import { getCurrentSession } from "@/server/provider-access";

// A username resolves against the database per request: profiles change, and a
// private profile must never be served from a shared cache.
export const dynamic = "force-dynamic";

/**
 * Public profile route (TASK-007 §4C/§4D).
 *
 * Resolution order:
 *   1. a real member profile — rendered from a DTO, never a raw row;
 *   2. a demonstration account, still rendered with its demo labelling;
 *   3. a genuine 404. A private profile takes this path for everyone but its
 *      owner, so "private" never becomes an existence oracle.
 *
 * PRIVACY NOTE (found by testing, not assumed): the loader returns an
 * ALLOWLISTED DTO and never the repository record. Next serialises values that
 * cross the server/client boundary — including, in development, the resolved
 * values attached to async frames — and an earlier version of this page returned
 * the raw record, which put the auth subject, timestamps and the `private`
 * visibility flag into the RSC payload of a 404 page. Converting here means
 * there is no raw row to serialise, in any rendering mode.
 */

type LoadedProfile =
  | { profile: PublicProfileDto; isOwner: false }
  | { profile: OwnerProfileDto; isOwner: true };

async function loadMemberProfile(
  handle: string,
): Promise<LoadedProfile | null> {
  const session = await getCurrentSession();
  const view = await getProfileService().findProfileForViewer(handle, session);
  if (!view) {
    return null;
  }
  return view.isOwner
    ? { profile: toOwnerProfileDto(view.profile), isOwner: true }
    : { profile: toPublicProfileDto(view.profile), isOwner: false };
}

/**
 * The member's posts for this surface. A database failure degrades to "no
 * posts" rather than failing the whole profile, and the service has already
 * applied the visibility rule (a private profile's posts are only returned to
 * its owner).
 */
async function loadMemberPosts(username: string): Promise<PostViewDto[]> {
  try {
    const session = await getCurrentSession();
    const page = await getPostsService().getPostsByUsername(session, username, {
      limit: 10,
    });
    return page.posts;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const loaded = await loadMemberProfile(handle);
  if (loaded) {
    return {
      title: `${loaded.profile.displayName} (@${loaded.profile.username})`,
    };
  }
  const demo = getAuthor(handle);
  return { title: demo ? `${demo.displayName} (demo)` : "Profile" };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const loaded = await loadMemberProfile(handle);
  if (loaded) {
    const [posts, session] = await Promise.all([
      loadMemberPosts(loaded.profile.username),
      getCurrentSession(),
    ]);
    return (
      <MemberProfileView
        profile={loaded.profile}
        isOwner={loaded.isOwner}
        posts={posts}
        signedIn={Boolean(session)}
      />
    );
  }

  const demo = getAuthor(handle);
  if (demo && demo.kind !== "business") {
    return <ProfileView author={demo} />;
  }

  notFound();
}
