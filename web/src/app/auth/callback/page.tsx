import type { Metadata } from "next";

import { AuthCallback } from "@/components/auth/AuthCallback";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Confirming your email" };

export default function AuthCallbackPage() {
  return (
    <AuthShell
      title="Confirming your email"
      description="One moment — we're finishing your confirmation."
    >
      <AuthCallback />
    </AuthShell>
  );
}
