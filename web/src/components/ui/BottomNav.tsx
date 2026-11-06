"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * Client navigation foundation for the product's candidate IA (Home, Services,
 * Create, Market, Profile). Labels/IA stay a RECOMMENDED pattern
 * (DESIGN_SYSTEM.md — validated by the product design task); screens they
 * point to are placeholders until their tasks are complete, and this
 * component is not yet mounted by the landing page for that reason.
 *
 * Accessibility: it is a real <nav> with a labelled <ul>, `aria-current` set
 * from the active path, and 44px minimum touch targets.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

export const CANDIDATE_PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/services", label: "Services", icon: "🧰" },
  { href: "/create", label: "Create", icon: "➕" },
  { href: "/market", label: "Market", icon: "🛒" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function BottomNav({
  items = CANDIDATE_PRIMARY_NAV,
  className,
}: {
  items?: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "safe-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-5xl justify-around px-2 py-1 sm:py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="min-w-[3.5rem] flex-1">
              {item.disabled ? (
                <span
                  aria-disabled={true}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-center text-[11px] text-ink-muted opacity-50"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-center text-[11px]",
                    active ? "text-primary" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
