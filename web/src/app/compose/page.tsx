import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PostStudio } from "@/components/compose/PostStudio";
import { getProfileService } from "@/modules/profile/provider";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Create a post" };

export const dynamic = "force-dynamic";

/**
 * Publishing is authenticated, so the studio is only rendered for a verified
 * member with a profile. Signed-out visitors are sent to sign-in and members
 * without a profile to onboarding — no fake composer, no "publish" that cannot
 * succeed.
 */
export default async function ComposePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Fcompose");
  }

  const profile = await getProfileService().getOwnProfile(session);
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <PostStudio username={profile.username} displayName={profile.displayName} />
  );
}
