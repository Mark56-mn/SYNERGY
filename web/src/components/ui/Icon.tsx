import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Dependency-free icon set (inline SVG). Decorative by default: every icon is
 * `aria-hidden` unless given a `label`, because the controls that use icons
 * carry their own accessible names.
 */
export type IconName =
  | "home"
  | "compass"
  | "plus"
  | "users"
  | "user"
  | "search"
  | "heart"
  | "comment"
  | "share"
  | "play"
  | "lock"
  | "globe"
  | "bell"
  | "arrow-right"
  | "close"
  | "check"
  | "sparkles"
  | "map-pin"
  | "briefcase"
  | "tag";

const shapes: Record<IconName, ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-5.5H9V21H4a1 1 0 0 1-1-1z" />
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.3 4.7-4.7 2.3 2.3-4.7z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.6 20a6.6 6.6 0 0 1 12.8 0" />
      <path d="M16.2 5.1a3.2 3.2 0 0 1 0 6.1M17.6 14.3A5.8 5.8 0 0 1 21.4 20" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.2 21a7.8 7.8 0 0 1 15.6 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  heart: (
    <path d="M12 20.4S4.5 15.8 4.5 10.8A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 3.6c0 5-7.5 9.6-7.5 9.6z" />
  ),
  comment: (
    <path d="M21 11.6a8 8 0 0 1-8 8H8.4L4 21.6v-6.4A8 8 0 0 1 12 3.6h1a8 8 0 0 1 8 8z" />
  ),
  share: (
    <path d="M4 12.8V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7.2M12 16V4M7.6 8.4 12 4l4.4 4.4" />
  ),
  play: <path d="M8.4 5.4v13.2L19 12z" />,
  lock: (
    <>
      <rect x="4.6" y="10.6" width="14.8" height="10" rx="2.2" />
      <path d="M8.2 10.6V7.8a3.8 3.8 0 0 1 7.6 0v2.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 12h17.6M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9.4a6 6 0 1 0-12 0c0 4.8-2 6-2 6h16s-2-1.2-2-6" />
      <path d="M10.4 19.6a2 2 0 0 0 3.2 0" />
    </>
  ),
  "arrow-right": <path d="M4.8 12h14.4M13.4 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.8 9.4 17 19 6.8" />,
  sparkles: (
    <>
      <path d="M12 3.4l1.7 4.6 4.6 1.7-4.6 1.7-1.7 4.6-1.7-4.6L5.7 9.7l4.6-1.7z" />
      <path d="M18.4 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s6.8-5.5 6.8-11a6.8 6.8 0 1 0-13.6 0C5.2 15.5 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.2" />
      <path d="M8.4 7V5.4a2 2 0 0 1 2-2h3.2a2 2 0 0 1 2 2V7" />
    </>
  ),
  tag: (
    <>
      <path d="M20.2 12.4 12.6 20 4 11.4V4h7.4z" />
      <circle cx="8.6" cy="8.6" r="1.2" />
    </>
  ),
};

export function Icon({
  name,
  className,
  label,
}: {
  name: IconName;
  className?: string;
  /** Provide only when the icon itself conveys meaning not present in text. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      {...(label ? { role: "img", "aria-label": label } : {})}
      className={cn("h-5 w-5 shrink-0", className)}
    >
      {shapes[name]}
    </svg>
  );
}
