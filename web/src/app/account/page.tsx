import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { getProfileService } from "@/modules/profile/provider";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Your account" };

/**
 * The account page — requires a verified session, checked server-side before
 * anything renders.
 *
 * TASK-007 adds the profile summary here: this page is where a signed-in member
 * lands, so it is also where "you have no profile yet" must be answered with a
 * real onboarding link rather than a promise about a later step. The stored
 * profile id / auth subject is not displayed: it is an internal key, not
 * something a member needs.
 */
export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Faccount");
  }

  const profile = await getProfileService().getOwnProfile(session);

  return (
    <AuthShell
      title="Your account"
      description="Your verified SYNERGY identity."
    >
      <Card>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Signed in</CardTitle>
          <Badge tone="primary">Verified</Badge>
        </div>
        <CardBody>
          Your sign-in is verified by SYNERGY&apos;s identity provider. Email
          addresses and sign-in details are never shown on your profile.
        </CardBody>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Profile</CardTitle>
          {profile ? (
            <Badge
              tone={profile.visibility === "public" ? "neutral" : "warning"}
            >
              {profile.visibility === "public" ? "Public" : "Private"}
            </Badge>
          ) : null}
        </div>
        {profile ? (
          <>
            <CardBody>
              You appear as <strong>{profile.displayName}</strong> (@
              {profile.username}).
            </CardBody>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/u/${profile.username}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-bg hover:bg-primary-hover"
              >
                View my profile
              </Link>
              <Link
                href="/profile/edit"
                className="inline-flex items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
              >
                Edit profile
              </Link>
            </div>
          </>
        ) : (
          <>
            <CardBody>
              Your account has no profile yet. Choose a username to finish
              setting it up — nobody else can see your account until you do.
            </CardBody>
            <Link
              href="/onboarding"
              className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-bg hover:bg-primary-hover"
            >
              Set up my profile
            </Link>
          </>
        )}
      </Card>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <LogoutButton />
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-semibold text-primary hover:underline"
        >
          Back to home
        </Link>
      </div>
    </AuthShell>
  );
}
