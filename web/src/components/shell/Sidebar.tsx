"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ComposeButton } from "@/components/shell/ComposeButton";
import { Icon } from "@/components/ui/Icon";
import { isActivePath, PRIMARY_NAV } from "@/components/ui/BottomNav";
import { cn } from "@/lib/cn";

/** Desktop left navigation; the same destinations as the mobile bottom bar. */
export function Sidebar() {
  const pathname = usePathname();

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
      <p className="mt-1 px-2 text-[11px] uppercase tracking-wide text-ink-muted">
        Ibadan · prototype
      </p>

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

      <div className="mt-auto space-y-2 px-2">
        <p className="rounded-md border border-border bg-bg/60 p-3 text-[11px] leading-5 text-ink-muted">
          Prototype build. Profiles and posts are fictional demonstrations — no
          account, message or listing is stored.
        </p>
        <p className="text-[11px] text-ink-muted">
          Dark navy · Mint · Ibadan-first
        </p>
      </div>
    </aside>
  );
}
