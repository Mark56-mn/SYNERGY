import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentSession } from "@/server/provider-access";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign-in page (server component). An already-signed-in user is sent to
 * their destination rather than shown a redundant form.
 *
 * The form is ALWAYS rendered (TASK-006C): hiding the controls when the
 * provider is unconfigured looked like a broken page. When Auth is not
 * configured, the auth API returns the accurate configuration error on
 * submit instead.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; confirmed?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const session = await getCurrentSession();
  if (session) {
    redirect(next);
  }

  const initialNotice = params.confirmed
    ? "Your email is confirmed. Sign in to continue."
    : params.reset
      ? "Your password has been updated. Sign in with your new password."
      : undefined;

  return (
    <AuthShell
      title="Sign in to SYNERGY"
      description="Welcome back. Sign in to continue to your communities, services and feed."
      footer={
        <>
          New to SYNERGY?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={next} initialNotice={initialNotice} />
    </AuthShell>
  );
}
