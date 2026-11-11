import { cn } from "@/lib/cn";

/**
 * Avatar. When a verified HTTPS photo URL is supplied (TASK-007B uploaded
 * Cloudinary photo) it is rendered as a photo; otherwise the component
 * falls back to initials with a stable tint. No profile photos are fabricated
 * for demonstration accounts — demo avatars keep initials. The text
 * alternative states that the identity is fictional when `demo` is set, and
 * the photo alt attributes the picture to its owner.
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

function resolveAvatarSrc(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("/")) return src;
  if (/^https?:\/\//i.test(src)) {
    try {
      const url = new URL(src);
      return url.protocol === "https:" ? src : null;
    } catch {
      return null;
    }
  }
  // Stored Supabase media object path -> server-signed display URL.
  return `/api/v1/profile/avatar?path=${encodeURIComponent(src)}`;
}

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
  src,
  className,
}: {
  name: string;
  /** Stable string (handle) used for the tint. */
  seed: string;
  size?: keyof typeof sizes;
  demo?: boolean;
  /** Uploaded portrait URL; only `https:` values are rendered. */
  src?: string | null;
  className?: string;
}) {
  const displaySrc = resolveAvatarSrc(src);
  if (displaySrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt={`${name}${demo ? " (demonstration profile)" : " profile photo"}`}
        width={64}
        height={64}
        loading="lazy"
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center rounded-full border border-border object-cover",
          sizes[size],
          className,
        )}
      />
    );
  }
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
