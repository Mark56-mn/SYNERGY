import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberProfileView } from "@/components/profile/MemberProfileView";
import { ErrorState } from "@/components/ui/States";
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

  let profile: Awaited<
    ReturnType<ReturnType<typeof getProfileService>["getOwnProfile"]>
  >;
  try {
    profile = await getProfileService().getOwnProfile(session);
  } catch {
    // A failed profile read must render an intentional recovery surface, not
    // a blank page. Nothing is fabricated and the account/photo is untouched.
    return (
      <div className="px-4 py-6 sm:px-5">
        <ErrorState
          title="Your profile could not load"
          description="We could not read your profile just now. Your account and saved photo were not changed."
          retryAction={
            <a
              href="/profile"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover"
            >
              Try again
            </a>
          }
        />
      </div>
    );
  }

  if (!profile) {
    redirect("/onboarding");
  }

  return <MemberProfileView profile={toOwnerProfileDto(profile)} isOwner />;
}
