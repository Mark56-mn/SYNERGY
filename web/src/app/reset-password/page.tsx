import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordFlow } from "@/components/auth/ResetPasswordFlow";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Set new password" };

/**
 * Reset-password page (server component). If the visitor already has a
 * verified session, the client flow can skip the email-link step entirely;
 * otherwise it establishes the session from the recovery link first. The
 * flow is always rendered (TASK-006C); an unconfigured environment fails
 * at the establish step with the provider's configuration error, shown
 * honestly as an unusable link.
 */
export default async function ResetPasswordPage() {
  const session = await getCurrentSession();

  return (
    <AuthShell
      title="Set a new password"
      description="Choose a strong password you haven't used elsewhere."
    >
      <ResetPasswordFlow hasSession={Boolean(session)} />
    </AuthShell>
  );
}
