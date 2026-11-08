import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Your account" };

/**
 * The account page — the one route that requires a verified session.
 *
 * The check runs SERVER-SIDE before anything renders, so a signed-out
 * visitor is redirected to sign-in without ever seeing account content
 * (no client-side flash of private data). What is shown is the
 * provider-verified user id — the identity every other part of the app
 * attributes actions to. The persisted profile record itself is a later
 * task and is not faked here.
 */
export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Faccount");
  }

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
        <CardBody>Your account ID (used to attribute your actions):</CardBody>
        <p className="mt-1 break-all font-mono text-sm text-ink">
          {session.userId}
        </p>
        <CardBody>
          Your full profile is coming in a later step; nothing is lost by
          signing out — your account stays yours.
        </CardBody>
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
