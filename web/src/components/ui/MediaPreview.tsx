import type { DemoMediaPreview } from "@/lib/demo-content";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

const aspectClass: Record<DemoMediaPreview["aspect"], string> = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[16/10]",
};

/**
 * Demonstration media frame.
 *
 * No photographs are fabricated for demo accounts, so this renders token-based
 * cover art instead of stock imagery. The element is labelled as a
 * demonstration preview for screen readers and sighted users alike.
 */
export function MediaPreview({
  media,
  className,
}: {
  media: DemoMediaPreview;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Demonstration ${media.kind} preview: ${media.label}`}
      className={cn(
        "demo-cover relative w-full overflow-hidden rounded-md border border-border",
        aspectClass[media.aspect],
        className,
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-bg/50 text-primary">
          <Icon name={media.kind === "video" ? "play" : "sparkles"} />
        </span>
        <p className="max-w-[24ch] text-sm font-medium text-ink">
          {media.label}
        </p>
      </div>
      <p className="absolute bottom-2 left-3 text-[11px] uppercase tracking-wide text-ink-muted">
        Demonstration media
      </p>
      {media.durationLabel ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-bg/85 px-2 py-0.5 text-[11px] font-medium text-ink">
          {media.durationLabel}
        </span>
      ) : null}
    </div>
  );
}
