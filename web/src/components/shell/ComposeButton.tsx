import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

/**
 * Primary create destination (TASK-008B).
 *
 * The previous version opened a layout-preview dialog because publishing did
 * not exist. Publishing now does exist, so both variants are real links to
 * `/compose`, where the server decides whether the visitor can publish
 * (sign-in and profile gates are server-side).
 */
export function ComposeButton({ variant }: { variant: "sidebar" | "fab" }) {
  if (variant === "sidebar") {
    return (
      <Link
        href="/compose"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-bg transition-colors hover:bg-primary-hover focus-visible:outline-none"
      >
        <Icon name="plus" className="h-4 w-4" />
        Create
      </Link>
    );
  }

  return (
    <Link
      href="/compose"
      aria-label="Create a post"
      className="-mt-4 flex h-14 w-14 items-center justify-center rounded-full border border-bg bg-primary text-bg shadow-raised transition-colors hover:bg-primary-hover focus-visible:outline-none"
    >
      <Icon name="plus" className="h-6 w-6" />
    </Link>
  );
}
