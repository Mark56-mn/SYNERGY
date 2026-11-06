import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-ink">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
