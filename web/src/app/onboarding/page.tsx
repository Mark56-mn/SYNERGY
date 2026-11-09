import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getProfileService } from "@/modules/profile/provider";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Set up your profile" };

// The page reads the verified session and the member's profile row per request;
// there is nothing sensible to prerender and no credentials at build time.
export const dynamic = "force-dynamic";

/**
 * Onboarding (TASK-007 §4B). A signed-out visitor is sent to sign-in with a
 * return path; a member who already has a profile is sent to it instead of being
 * asked to create a second one — the form is only reachable while it is needed.
 */
export default async function OnboardingPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Fonboarding");
  }

  const existing = await getProfileService().getOwnProfile(session);
  if (existing) {
    redirect("/profile");
  }

  return (
    <AuthShell
      title="Set up your profile"
      description="Choose the username other members will see. You can change these details later."
    >
      <ProfileForm mode="onboarding" />
    </AuthShell>
  );
}
