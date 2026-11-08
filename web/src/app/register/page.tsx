import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  getCurrentSession,
  isSupabaseAuthConfigured,
} from "@/server/provider-access";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }

  const configured = isSupabaseAuthConfigured();

  return (
    <AuthShell
      title="Create your SYNERGY account"
      description="One account for people, creators, communities, services and products — Ibadan first."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {configured ? (
        <RegisterForm />
      ) : (
        <p className="text-sm leading-6 text-ink-muted">
          Authentication isn&apos;t configured in this environment yet, so
          registration is unavailable. Public browsing still works.
        </p>
      )}
    </AuthShell>
  );
}
