"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { PostViewDto } from "@synergy/domain";

/**
 * A REAL member post (TASK-008A) — distinct from the fictional demonstration
 * `PostCard` used on demo profile/community pages.
 *
 * Interactions are honest about their state:
 *
 * - Like is persisted (`POST`/`DELETE /api/v1/posts/[id]/like`). Signed-out
 *   visitors get a sign-in link, never a button that silently does nothing.
 * - Share uses the native share sheet or the clipboard and reports the actual
 *   outcome; there is no share count to fake.
 * - Comments are labelled as arriving with a later task rather than collecting
 *   text that would be discarded.
 * - The author can delete their own post; the row disappears only after the
 *   server confirms, and a failure keeps the post with an error message.
 */

export function MemberPostCard({
  post,
  signedIn,
  onLikeChange,
  onDeleted,
}: {
  post: PostViewDto;
  signedIn: boolean;
  onLikeChange?: (postId: string, liked: boolean, likeCount: number) => void;
  onDeleted?: (postId: string) => void;
}) {
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likePending, setLikePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  if (deleted) {
    return null;
  }

  async function toggleLike() {
    const next = !liked;
    setLikePending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/posts/${post.id}/like`, {
        method: next ? "POST" : "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Your session has ended. Sign in to like this post."
            : "The like was not saved. Please try again.",
        );
        return;
      }
      const body = (await response.json()) as {
        likeCount: number;
        liked: boolean;
      };
      setLiked(body.liked);
      setLikeCount(body.likeCount);
      onLikeChange?.(post.id, body.liked, body.likeCount);
    } catch {
      setError("Network problem — the like was not saved.");
    } finally {
      setLikePending(false);
    }
  }

  async function share() {
    setNotice(null);
    const url = `${window.location.origin}/u/${post.author.username}`;
    const shareCapable = navigator as Navigator & {
      share?: (data: {
        title: string;
        text: string;
        url: string;
      }) => Promise<void>;
    };
    try {
      if (typeof shareCapable.share === "function") {
        await shareCapable.share({
          title: `${post.author.displayName} on SYNERGY`,
          text: post.body.slice(0, 140),
          url,
        });
        setNotice("Shared.");
        return;
      }
      if (!navigator.clipboard) {
        setNotice(
          "This device cannot share from the browser. The post is on the author's profile.",
        );
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Profile link copied.");
    } catch {
      setNotice(
        "Could not share on this device. The post is on the author's profile.",
      );
    }
  }

  async function remove() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this post? It will be removed from the feed.")
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/posts/${post.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        setError("The post could not be deleted. Please try again.");
        return;
      }
      setDeleted(true);
      onDeleted?.(post.id);
    } catch {
      setError("Network problem — the post was not deleted.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      aria-labelledby={`post-${post.id}-author`}
      className="border-b border-border px-4 py-5 sm:px-5"
    >
      <header className="flex items-start gap-3">
        <Link
          href={`/u/${post.author.username}`}
          className="rounded-full"
          aria-label={`${post.author.displayName} profile`}
        >
          <Avatar
            name={post.author.displayName}
            seed={post.author.username}
            src={post.author.avatarUrl}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              id={`post-${post.id}-author`}
              href={`/u/${post.author.username}`}
              className="text-sm font-semibold text-ink hover:text-primary"
            >
              {post.author.displayName}
            </Link>
            <span className="text-xs text-ink-muted">
              @{post.author.username}
            </span>
            <span aria-hidden="true" className="text-xs text-ink-muted">
              ·
            </span>
            <time dateTime={post.createdAt} className="text-xs text-ink-muted">
              {post.timeLabel}
            </time>
            {post.isOwner ? (
              <Badge tone="primary" className="ml-auto">
                Your post
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">Member post</p>
        </div>
      </header>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
        {post.body}
      </p>

      {post.mediaUrl ? (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.mediaUrl}
            alt={post.mediaAlt ?? `Photo shared by ${post.author.displayName}`}
            loading="lazy"
            className="max-h-[32rem] w-full rounded-md border border-border object-cover"
          />
        </div>
      ) : null}

      {post.topics.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {post.topics.map((topic) => (
            <li key={topic}>
              <Link
                href={`/discover?topic=${encodeURIComponent(topic)}`}
                className="inline-flex min-h-[32px] items-center rounded-full border border-border px-2.5 text-xs font-medium text-primary hover:border-primary"
              >
                #{topic}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1 text-ink-muted">
        {signedIn ? (
          <button
            type="button"
            aria-pressed={liked}
            disabled={likePending}
            onClick={toggleLike}
            className={cn(
              "inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-60",
              liked && "text-danger",
            )}
          >
            <Icon
              name="heart"
              className={cn("h-4 w-4", liked && "fill-current")}
            />
            {liked ? "Liked" : "Like"}
            <span aria-hidden="true">{likeCount}</span>
            <span className="sr-only">{likeCount} likes</span>
          </button>
        ) : (
          <Link
            href="/login?next=%2F"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-surface-raised hover:text-ink"
          >
            <Icon name="heart" className="h-4 w-4" />
            Sign in to like
            <span aria-hidden="true">{likeCount}</span>
          </Link>
        )}

        <button
          type="button"
          aria-disabled="true"
          className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1.5 rounded-md px-2 text-xs font-medium opacity-60"
        >
          <Icon name="comment" className="h-4 w-4" />
          Comment
          <span className="sr-only">
            (comments arrive with a later task; nothing is saved)
          </span>
        </button>

        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-surface-raised hover:text-ink"
        >
          <Icon name="share" className="h-4 w-4" />
          Share
        </button>

        {post.isOwner ? (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-muted transition-colors hover:text-danger disabled:opacity-60"
          >
            <Icon name="close" className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-1 text-xs text-ink-muted">
          {notice}
        </p>
      ) : null}
    </article>
  );
}
