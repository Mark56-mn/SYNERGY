import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  getCurrentSession,
  isSupabaseAuthConfigured,
} from "@/server/provider-access";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign-in page (server component). An already-signed-in user is sent to
 * their destination rather than shown a redundant form. When Auth is not
 * configured in this environment, the honest answer is a setup notice —
 * never a form that cannot work.
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

  const configured = isSupabaseAuthConfigured();
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
      {configured ? (
        <LoginForm next={next} initialNotice={initialNotice} />
      ) : (
        <p className="text-sm leading-6 text-ink-muted">
          Authentication isn&apos;t configured in this environment yet, so
          signing in is unavailable. Public browsing still works.
        </p>
      )}
    </AuthShell>
  );
}
