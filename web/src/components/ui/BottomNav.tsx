"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ComposeButton } from "@/components/shell/ComposeButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { AuthNavState } from "@/lib/auth-nav";
import { cn } from "@/lib/cn";

/**
 * Primary navigation. The DESIGN_SYSTEM.md IA (Home, Services, Create, Market,
 * Profile) is a RECOMMENDED pattern pending product-design validation, so this
 * build implements it as Home / Discover / Create / Communities / Profile:
 * Services and Market live inside Discover until their own tasks exist, and the
 * Android shell uses the same five destinations.
 *
 * The fourth destination is auth-aware (TASK-006B): signed-in users get
 * Account (`/account`); signed-out visitors get Sign in (`/login`) instead
 * of being pointed at a demo profile. The demo `/u/…` routes remain public
 * and reachable from Discover.
 */
export const PRIMARY_NAV: Array<{
  href: string;
  label: string;
  icon: IconName;
}> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/communities", label: "Communities", icon: "users" },
  { href: "/u/amara.makes", label: "Profile", icon: "user" },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Mobile bottom bar: four destinations plus the central create action. */
export function BottomNav({ authState }: { authState?: AuthNavState }) {
  const pathname = usePathname();
  const [home, discover, communities] = PRIMARY_NAV;
  const accountItem = authState?.userId
    ? { href: "/account", label: "Account", icon: "user" as const }
    : { href: "/login", label: "Sign in", icon: "user" as const };

  const renderItem = (item: {
    href: string;
    label: string;
    icon: IconName;
  }) => (
    <li key={item.href}>
      <Link
        href={item.href}
        aria-current={
          isActivePath(pathname ?? "", item.href) ? "page" : undefined
        }
        className={cn(
          "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium",
          isActivePath(pathname ?? "", item.href)
            ? "text-primary"
            : "text-ink-muted hover:text-ink",
        )}
      >
        <Icon name={item.icon} />
        {item.label}
      </Link>
    </li>
  );

  return (
    // Distinct from the desktop nav label so the two landmarks are never
    // announced with the same name (axe landmark-unique).
    <nav
      aria-label="Primary (mobile)"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1">
        {[home!, discover!].map(renderItem)}
        <li className="flex justify-center">
          <ComposeButton variant="fab" />
        </li>
        {renderItem(communities!)}
        {renderItem(accountItem)}
      </ul>
    </nav>
  );
}
