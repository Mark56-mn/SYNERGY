import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { getProfileService } from "@/modules/profile/provider";
import { getCurrentSession } from "@/server/provider-access";
import { tokens } from "@synergy/design-tokens";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SYNERGY",
    template: "%s · SYNERGY",
  },
  description:
    "SYNERGY connects people, creators, communities, services and products in Nigeria — an integrated social and commerce ecosystem.",
  // No analytics/tracking is configured (out of scope, unapproved).
};

export const viewport: Viewport = {
  themeColor: tokens.colors.bg,
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout. Resolves the session cookie through the provider-verified
 * path so navigation renders the correct signed-in/signed-out state on the
 * first paint — no client-side flip, and no private content can flash
 * before the check. This makes pages dynamic by design: personalized
 * navigation requires a per-request auth check, which is the honest
 * trade-off for a correct login experience.
 */
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getCurrentSession();

  // Resolve the member's saved profile (if any) so the mobile account menu
  // can render their real photo, with initials as the fallback. Identity
  // still comes from the verified session; this is a read of the member's
  // own profile only.
  const profile = session
    ? await getProfileService()
        .getOwnProfile(session)
        .catch(() => null)
    : null;

  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-ink">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppShell
          authState={{
            signedIn: Boolean(session),
            avatarUrl: profile?.avatarUrl ?? null,
            displayName: profile?.displayName ?? null,
          }}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
