import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { getProfileService } from "@/modules/profile/provider";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Edit your profile" };

export const dynamic = "force-dynamic";

/**
 * Edit profile (TASK-007 §4C). Prefilled from the stored record; the form
 * submits the same fields onboarding uses, so there is one validation path.
 */
export default async function EditProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Fprofile%2Fedit");
  }

  const profile = await getProfileService().getOwnProfile(session);
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Edit your profile</h1>
        <Link
          href={`/u/${profile.username}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          View profile
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Changes are saved to your account and stay after you sign out.
      </p>
      <div className="mt-5">
        <ProfileForm
          mode="edit"
          initial={{
            username: profile.username,
            displayName: profile.displayName,
            bio: profile.bio ?? "",
            avatarUrl: profile.avatarUrl ?? "",
            visibility: profile.visibility,
          }}
        />
      </div>
    </div>
  );
}
