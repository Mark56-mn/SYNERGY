import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordFlow } from "@/components/auth/ResetPasswordFlow";
import {
  getCurrentSession,
  isSupabaseAuthConfigured,
} from "@/server/provider-access";

export const metadata: Metadata = { title: "Set new password" };

/**
 * Reset-password page (server component). If the visitor already has a
 * verified session, the client flow can skip the email-link step entirely;
 * otherwise it establishes the session from the recovery link first.
 */
export default async function ResetPasswordPage() {
  const configured = isSupabaseAuthConfigured();
  const session = configured ? await getCurrentSession() : null;

  return (
    <AuthShell
      title="Set a new password"
      description="Choose a strong password you haven't used elsewhere."
    >
      {configured ? (
        <ResetPasswordFlow hasSession={Boolean(session)} />
      ) : (
        <p className="text-sm leading-6 text-ink-muted">
          Authentication isn&apos;t configured in this environment yet, so
          password reset is unavailable.
        </p>
      )}
    </AuthShell>
  );
}
