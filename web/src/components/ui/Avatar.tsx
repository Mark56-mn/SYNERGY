import { cn } from "@/lib/cn";

/**
 * Initial-based avatar. No profile photos are fabricated for demonstration
 * accounts, so avatars derive a stable tint from the handle and show initials.
 * The text alternative states that the identity is fictional when `demo` is
 * set.
 */
const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-2xl",
} as const;

const tones = [
  "bg-primary/15 text-primary",
  "bg-surface-raised text-ink",
  "bg-primary/10 text-primary-hover",
  "bg-surface-raised text-ink-muted",
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function toneFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return tones[hash % tones.length]!;
}

export function Avatar({
  name,
  seed,
  size = "md",
  demo = false,
  className,
}: {
  name: string;
  /** Stable string (handle) used for the tint. */
  seed: string;
  size?: keyof typeof sizes;
  demo?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${name}${demo ? " (demonstration profile)" : ""}`}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full border border-border font-semibold",
        sizes[size],
        toneFor(seed),
        className,
      )}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  );
}
