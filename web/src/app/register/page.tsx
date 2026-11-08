import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Create account" };

/**
 * Registration page. The form is always rendered (TASK-006C); when Auth is
 * unconfigured the API explains why on submit. An already-signed-in user
 * is redirected home instead of seeing a redundant form.
 */
export default async function RegisterPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/");
  }

  return (
    <AuthShell
      title="Create your SYNERGY account"
      description="One account for people, creators, communities, services and products."
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
      <RegisterForm />
    </AuthShell>
  );
}
