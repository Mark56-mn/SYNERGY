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
 * The Profile destination is auth-aware (TASK-007B): signed-in members get
 * their own profile at `/profile` (resolved server-side from the verified
 * session, redirecting to onboarding when no profile exists); signed-out
 * visitors get Sign in (`/login`) instead. Demo profiles (`/u/…`) remain
 * public demo content reachable from Discover — never presented as a member's
 * own profile.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

/** Desktop sidebar destinations (identical IA on both widths). */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/communities", label: "Communities", icon: "users" },
];

/**
 * Build the primary destinations for the current member. Signed-in members
 * are taken to their own profile; visitors are taken to sign-in. The demo
 * profile is never returned here.
 */
export function getPrimaryNavItems(signedIn: boolean): NavItem[] {
  return [
    ...PRIMARY_NAV,
    signedIn
      ? { href: "/profile", label: "Profile", icon: "user" }
      : { href: "/login?next=%2Fprofile", label: "Profile", icon: "user" },
  ];
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Mobile bottom bar: four destinations plus the central create action. */
export function BottomNav({ authState }: { authState?: AuthNavState }) {
  const pathname = usePathname();
  const signedIn = Boolean(authState?.signedIn);
  const [home, discover, communities] = PRIMARY_NAV;
  const profileItem = signedIn
    ? { href: "/profile", label: "Profile", icon: "user" as IconName }
    : { href: "/login", label: "Sign in", icon: "user" as IconName };

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
        {renderItem(profileItem)}
      </ul>
    </nav>
  );
}
