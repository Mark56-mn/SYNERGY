import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberProfileView } from "@/components/profile/MemberProfileView";
import { getProfileService } from "@/modules/profile/provider";
import { toOwnerProfileDto } from "@/modules/profile/service";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Your profile" };

export const dynamic = "force-dynamic";

/**
 * The member's own profile. Same visual surface as the public page, with the
 * owner-only settings and the edit affordance. A member without a profile is
 * sent to onboarding rather than shown an empty shell.
 */
export default async function OwnProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Fprofile");
  }

  const profile = await getProfileService().getOwnProfile(session);
  if (!profile) {
    redirect("/onboarding");
  }

  return <MemberProfileView profile={toOwnerProfileDto(profile)} isOwner />;
}
