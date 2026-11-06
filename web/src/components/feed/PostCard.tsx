"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { MediaPreview } from "@/components/ui/MediaPreview";
import { cn } from "@/lib/cn";
import { formatCount, getAuthor, type DemoPost } from "@/lib/demo-content";

/**
 * Feed card. The like control is a LOCAL preview toggle — it never posts to a
 * server and the card says so — while comment/share are marked unavailable
 * rather than pretending to work. Sponsored slots are intentionally absent;
 * the layout leaves room for a labelled placement later.
 */
export function PostCard({ post }: { post: DemoPost }) {
  const author = getAuthor(post.authorHandle);
  const [liked, setLiked] = useState(false);

  if (!author) {
    return null;
  }

  const likeCount = post.likes + (liked ? 1 : 0);
  const profileHref = `/u/${author.handle}`;

  return (
    <article
      aria-labelledby={`post-${post.id}-author`}
      className="border-b border-border px-4 py-5 sm:px-5"
    >
      <header className="flex items-start gap-3">
        <Link
          href={profileHref}
          className="rounded-full"
          aria-label={`${author.displayName} (demonstration profile)`}
        >
          <Avatar name={author.displayName} seed={author.handle} demo />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              id={`post-${post.id}-author`}
              href={profileHref}
              className="text-sm font-semibold text-ink hover:text-primary"
            >
              {author.displayName}
            </Link>
            <span className="text-xs text-ink-muted">@{author.handle}</span>
            <span aria-hidden="true" className="text-xs text-ink-muted">
              ·
            </span>
            <time className="text-xs text-ink-muted">{post.timeLabel}</time>
            <Badge tone="warning" className="ml-auto">
              Demo
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {author.category} · {author.location}
          </p>
        </div>
      </header>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
        {post.body}
      </p>

      {post.media ? (
        <div className="mt-3">
          <MediaPreview media={post.media} />
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-1 text-ink-muted">
        <button
          type="button"
          aria-pressed={liked}
          onClick={() => setLiked((current) => !current)}
          className={cn(
            "inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-surface-raised hover:text-ink",
            liked && "text-danger",
          )}
        >
          <Icon
            name="heart"
            className={cn("h-4 w-4", liked && "fill-current")}
          />
          Like
          <span aria-hidden="true">{formatCount(likeCount)}</span>
          <span className="sr-only">{likeCount} likes</span>
        </button>
        <button
          type="button"
          aria-disabled="true"
          className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1.5 rounded-md px-2 text-xs font-medium opacity-60"
        >
          <Icon name="comment" className="h-4 w-4" />
          Comment
          <span aria-hidden="true">{formatCount(post.comments)}</span>
          <span className="sr-only">(not available in this build)</span>
        </button>
        <button
          type="button"
          aria-disabled="true"
          className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1.5 rounded-md px-2 text-xs font-medium opacity-60"
        >
          <Icon name="share" className="h-4 w-4" />
          Share
          <span className="sr-only">(not available in this build)</span>
        </button>
      </div>
      <p className="text-[11px] leading-4 text-ink-muted">
        Preview actions — likes and comments are not saved in this build.
      </p>
    </article>
  );
}

/** Loading placeholder matching the post card rhythm. */
export function PostSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="border-b border-border px-4 py-5 sm:px-5"
    >
      <div className="flex gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-raised" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 animate-pulse rounded-sm bg-surface-raised" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-surface-raised" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded-sm bg-surface-raised" />
        <div className="h-3 w-5/6 animate-pulse rounded-sm bg-surface-raised" />
        <div className="h-36 w-full animate-pulse rounded-md bg-surface-raised" />
      </div>
    </div>
  );
}
