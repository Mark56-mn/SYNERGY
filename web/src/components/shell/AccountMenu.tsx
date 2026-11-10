"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { AuthNavState } from "@/lib/auth-nav";

/**
 * Mobile account menu (TASK-007F).
 *
 * Signed-out visitors get the same Sign in affordance as before. Signed-in
 * members get an expandable menu: their saved photo (or initials), plus
 * working links to My Profile, Edit Profile and Account Settings, and Sign
 * out. The menu is keyboard accessible and closes on Escape, outside click
 * or navigation.
 */
export function AccountMenu({ authState }: { authState?: AuthNavState }) {
  const pathname = usePathname();
  const signedIn = Boolean(authState?.signedIn);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Move focus into the menu for keyboard users.
    firstItemRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="flex h-10 items-center rounded-full border border-border px-3 text-sm font-medium text-ink-muted"
        aria-label="Sign in"
      >
        Sign in
      </Link>
    );
  }

  const avatarUrl = authState?.avatarUrl ?? null;
  const displayName = authState?.displayName ?? "Member";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label="Your account menu"
        className="flex h-10 items-center gap-2 rounded-full border border-border px-2 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar
          name={displayName}
          seed={displayName}
          size="sm"
          src={avatarUrl}
        />
        <span className="hidden sm:inline">Account</span>
      </button>

      {open ? (
        <div
          id="account-menu"
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <Avatar
              name={displayName}
              seed={displayName}
              size="md"
              src={avatarUrl}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {displayName}
              </p>
              <p className="text-xs text-ink-muted">Your account</p>
            </div>
          </div>
          <ul className="py-1">
            <li>
              <Link
                ref={firstItemRef}
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center px-3 text-sm text-ink hover:bg-surface-raised"
              >
                My Profile
              </Link>
            </li>
            <li>
              <Link
                href="/profile/edit"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center px-3 text-sm text-ink hover:bg-surface-raised"
              >
                Edit Profile
              </Link>
            </li>
            <li>
              <Link
                href="/account"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center px-3 text-sm text-ink hover:bg-surface-raised"
              >
                Account Settings
              </Link>
            </li>
            <li className="border-t border-border px-3 py-2">
              <LogoutButton className="w-full" />
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
