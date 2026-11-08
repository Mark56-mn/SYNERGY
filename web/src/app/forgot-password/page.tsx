import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

/**
 * Password-recovery page. The form is always rendered (TASK-006C); when
 * Auth is unconfigured the API explains why on submit.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you registered with and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
