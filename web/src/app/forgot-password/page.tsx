import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isSupabaseAuthConfigured } from "@/server/provider-access";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const configured = isSupabaseAuthConfigured();

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you registered with and we'll send you a reset link."
    >
      {configured ? (
        <ForgotPasswordForm />
      ) : (
        <p className="text-sm leading-6 text-ink-muted">
          Authentication isn&apos;t configured in this environment yet, so
          password reset is unavailable.
        </p>
      )}
    </AuthShell>
  );
}
