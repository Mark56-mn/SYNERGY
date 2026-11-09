import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/ui/BottomNav";
import { Icon } from "@/components/ui/Icon";
import type { AuthNavState } from "@/lib/auth-nav";
import { RightRail } from "@/components/shell/RightRail";
import { Sidebar } from "@/components/shell/Sidebar";

/**
 * Responsive application shell.
 *
 * - Desktop (lg+): persistent left navigation, central content, contextual rail
 *   on wide screens (xl+).
 * - Mobile: compact top bar, single-column content, fixed bottom navigation
 *   with safe-area padding.
 *
 * One layout, not two: the same components and content reflow between widths.
 *
 * `authState` comes from the root layout's server-side session check
 * (a signed-in boolean only). It drives the sign-in/account
 * affordances; the demo disclosure below it is unchanged and applies to the
 * demonstration content, never to the real account surface.
 */
export function AppShell({
  children,
  authState,
}: {
  children: ReactNode;
  authState?: AuthNavState;
}) {
  const signedIn = Boolean(authState?.signedIn);
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <Sidebar authState={authState} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="safe-top sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-base font-bold tracking-tight text-primary"
              >
                <Icon name="sparkles" className="h-4 w-4" />
                SYNERGY
              </Link>
              <div className="flex items-center gap-2">
                {signedIn ? (
                  <Link
                    href="/account"
                    className="flex h-10 items-center rounded-full border border-border px-3 text-sm font-medium text-ink-muted"
                    aria-label="Your account"
                  >
                    Account
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="flex h-10 items-center rounded-full border border-border px-3 text-sm font-medium text-ink-muted"
                    aria-label="Sign in"
                  >
                    Sign in
                  </Link>
                )}
                <a
                  href="/discover"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-muted"
                  aria-label="Search and discover (opens Discover)"
                >
                  <Icon name="search" className="h-4 w-4" />
                </a>
              </div>
            </div>
          </header>

          <div className="flex min-w-0 flex-1 justify-center gap-6 px-0 sm:px-4 lg:px-6">
            <main
              id="main-content"
              className="min-w-0 w-full max-w-content pb-24 lg:max-w-content lg:pb-8 lg:pt-5"
            >
              <p className="border-b border-border bg-surface/60 px-4 py-2 text-[11px] leading-4 text-ink-muted sm:rounded-md sm:border sm:px-3">
                <span className="font-semibold text-warning">Demo build.</span>{" "}
                Anything labelled “Demo” is a fictional example. Posts and
                profiles you create are saved to this project&apos;s development
                database and are not shown to the public internet.
              </p>
              {children}
            </main>
            <RightRail />
          </div>
        </div>
      </div>

      <BottomNav authState={authState} />
    </div>
  );
}
