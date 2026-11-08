"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ComposeButton } from "@/components/shell/ComposeButton";
import { Icon } from "@/components/ui/Icon";
import { isActivePath, PRIMARY_NAV } from "@/components/ui/BottomNav";
import type { AuthNavState } from "@/lib/auth-nav";
import { cn } from "@/lib/cn";

/**
 * Desktop left navigation; the same destinations as the mobile bottom bar.
 *
 * Below the primary destinations, the server-provided `authState` decides
 * the account block: signed-out visitors see Sign in / Create account;
 * signed-in users see an Account link and Sign out. The demo profile route
 * (`/u/…`) stays a public demo destination and is never presented as the
 * viewer's own account.
 */
export function Sidebar({ authState }: { authState?: AuthNavState }) {
  const pathname = usePathname();
  const signedIn = Boolean(authState?.userId);

  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/40 px-4 py-6 lg:flex xl:w-64"
    >
      <Link
        href="/"
        className="flex items-center gap-2 px-2 text-lg font-bold tracking-tight text-primary"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15"
        >
          <Icon name="sparkles" className="h-4 w-4" />
        </span>
        SYNERGY
        <span className="sr-only">— home</span>
      </Link>
      <nav aria-label="Primary" className="mt-8">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-ink-muted hover:bg-surface-raised hover:text-ink",
                  )}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6">
        <ComposeButton variant="sidebar" />
      </div>

      <div className="mt-6 space-y-2">
        {signedIn ? (
          <>
            <Link
              href="/account"
              className="flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <Icon name="user" />
              Your account
            </Link>
            <LogoutButton className="block px-3 [&>button]:w-full" />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-bg hover:bg-primary-hover"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 py-2.5 text-base font-semibold text-ink hover:border-primary hover:text-primary"
            >
              Create account
            </Link>
          </>
        )}
      </div>

      <div className="mt-auto space-y-2 px-2">
        <p className="rounded-md border border-border bg-bg/60 p-3 text-[11px] leading-5 text-ink-muted">
          Prototype build. Profiles and posts are fictional demonstrations — no
          account, message or listing is stored.
        </p>
      </div>
    </aside>
  );
}
