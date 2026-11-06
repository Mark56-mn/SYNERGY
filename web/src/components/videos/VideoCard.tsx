import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { getAuthor, type DemoVideo } from "@/lib/demo-content";

/**
 * Video preview card. Playback is NOT implemented (the media pipeline is a
 * later phase), so the play control is disabled and labelled rather than
 * appearing to start a stream. The poster is token-based abstract art, not a
 * fabricated photograph.
 */
export function VideoCard({ video }: { video: DemoVideo }) {
  const author = getAuthor(video.authorHandle);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="demo-cover relative flex aspect-video items-center justify-center">
        <button
          type="button"
          disabled
          aria-label="Playback arrives with the media pipeline; video cannot play in this build"
          className="flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-full border border-primary/40 bg-bg/60 text-primary opacity-90"
        >
          <Icon name="play" label="Play (unavailable)" className="h-5 w-5" />
        </button>
        <span className="absolute bottom-2 right-2 rounded-full bg-bg/85 px-2 py-0.5 text-[11px] font-medium text-ink">
          {video.durationLabel}
        </span>
        <span className="absolute left-2 top-2">
          <Badge tone="warning">Demo</Badge>
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold leading-6 text-ink">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          {video.viewsLabel} (demo) · {video.topic}
        </p>
        {author ? (
          <div className="mt-3 flex items-center gap-2">
            <Avatar
              name={author.displayName}
              seed={author.handle}
              size="sm"
              demo
            />
            <Link
              href={`/u/${author.handle}`}
              className="truncate text-xs font-medium text-ink hover:text-primary"
            >
              {author.displayName}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
