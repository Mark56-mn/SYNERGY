import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Feed switch (TASK-008D): a link-based segmented control, not a client tab
 * widget, so both feeds remain real server routes with shareable URLs.
 */
export function FeedTabs({ active }: { active: "for-you" | "following" }) {
  const items = [
    { id: "for-you" as const, label: "For you", href: "/" },
    { id: "following" as const, label: "Following", href: "/following" },
  ];

  return (
    <nav
      aria-label="Feed"
      className="flex gap-1 border-b border-border px-4 sm:px-5"
    >
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
              selected
                ? "border-primary text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
