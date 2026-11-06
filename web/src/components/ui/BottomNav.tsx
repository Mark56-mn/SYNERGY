"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ComposeButton } from "@/components/shell/ComposeButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Primary navigation. The DESIGN_SYSTEM.md IA (Home, Services, Create, Market,
 * Profile) is a RECOMMENDED pattern pending product-design validation, so this
 * build implements it as Home / Discover / Create / Communities / Profile:
 * Services and Market live inside Discover until their own tasks exist, and the
 * Android shell uses the same five destinations.
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
export function BottomNav() {
  const pathname = usePathname();
  const [home, discover, communities, profile] = PRIMARY_NAV;

  return (
    // Distinct from the desktop nav label so the two landmarks are never
    // announced with the same name (axe landmark-unique).
    <nav
      aria-label="Primary (mobile)"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1">
        {[home!, discover!].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={
                isActivePath(pathname, item.href) ? "page" : undefined
              }
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium",
                isActivePath(pathname, item.href)
                  ? "text-primary"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
        <li className="flex justify-center">
          <ComposeButton variant="fab" />
        </li>
        {[communities!, profile!].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={
                isActivePath(pathname, item.href) ? "page" : undefined
              }
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium",
                isActivePath(pathname, item.href)
                  ? "text-primary"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
