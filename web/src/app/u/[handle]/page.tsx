import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MemberProfileView } from "@/components/profile/MemberProfileView";
import { ProfileView } from "@/components/profile/ProfileView";
import { getAuthor } from "@/lib/demo-content";
import { getProfileService } from "@/modules/profile/provider";
import {
  toOwnerProfileDto,
  toPublicProfileDto,
} from "@/modules/profile/service";
import { getCurrentSession } from "@/server/provider-access";

// A username resolves against the database per request: profiles change, and a
// private profile must never be served from a shared cache.
export const dynamic = "force-dynamic";

/**
 * Public profile route (TASK-007 §4C/§4D).
 *
 * Resolution order:
 *   1. a real member profile — rendered from the public DTO, or the owner DTO
 *      when the viewer is that member;
 *   2. a demonstration account, still rendered with its demo labelling (demo
 *      records must stay visibly fictional until a later task replaces them);
 *   3. a genuine 404. A private profile takes this path for everyone but its
 *      owner, so "private" never becomes an existence oracle.
 */
async function loadMemberProfile(handle: string) {
  const session = await getCurrentSession();
  const view = await getProfileService().findProfileForViewer(handle, session);
  return view;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const view = await loadMemberProfile(handle);
  if (view) {
    return { title: `${view.profile.displayName} (@${view.profile.username})` };
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

  const view = await loadMemberProfile(handle);
  if (view) {
    return (
      <MemberProfileView
        profile={
          view.isOwner
            ? toOwnerProfileDto(view.profile)
            : toPublicProfileDto(view.profile)
        }
        isOwner={view.isOwner}
      />
    );
  }

  const demo = getAuthor(handle);
  if (demo && demo.kind !== "business") {
    return <ProfileView author={demo} />;
  }

  notFound();
}
