"use client";

import Link from "next/link";
import { useState } from "react";

import { MemberPostCard } from "@/components/feed/MemberPostCard";
import { PostSkeleton } from "@/components/feed/PostCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { PostPageDto } from "@synergy/domain";

/**
 * The main social feed (TASK-008A).
 *
 * Server-rendered first page (no loading flash, no client fetch on arrival) and
 * a cursor-paginated "Load more" that appends real posts. An empty feed says so
 * and offers the next useful action — compose when signed in, sign in
 * otherwise — instead of showing demonstration posts as if members had written
 * them.
 */
export function MemberFeed({
  initial,
  signedIn,
  unavailable = false,
}: {
  initial: PostPageDto;
  signedIn: boolean;
  /** The database could not be reached (development without DATABASE_URL). */
  unavailable?: boolean;
}) {
  const [posts, setPosts] = useState(initial.posts);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/feed?cursor=${encodeURIComponent(nextCursor)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) {
        setError("More posts could not be loaded. Please try again.");
        return;
      }
      const page = (await response.json()) as PostPageDto;
      setPosts((current) => [...current, ...page.posts]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Network problem — more posts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="feed-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
        <div>
          <h2 id="feed-heading" className="text-base font-semibold text-ink">
            Feed
          </h2>
          <p className="text-[11px] text-ink-muted">
            Newest first · no ranking or personalisation yet
          </p>
        </div>
        <ButtonLink
          href={signedIn ? "/compose" : "/login?next=%2Fcompose"}
          size="sm"
        >
          {signedIn ? "Create post" : "Sign in to post"}
        </ButtonLink>
      </div>

      <div className="mt-3">
        {unavailable ? (
          <div className="px-4 sm:px-5">
            <ErrorState
              title="The feed is unavailable"
              description="The development database is not configured for this environment, so no posts can be loaded. Nothing is being simulated in its place."
              retryAction={
                <Link
                  href="/"
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  Try again
                </Link>
              }
            />
          </div>
        ) : posts.length === 0 ? (
          <div className="px-4 sm:px-5">
            <EmptyState
              title="No posts yet"
              description={
                signedIn
                  ? "Nothing has been published here yet. Share the first update with the community."
                  : "Nothing has been published here yet. Sign in to write the first post."
              }
              action={
                <ButtonLink
                  href={signedIn ? "/compose" : "/login?next=%2Fcompose"}
                  size="sm"
                >
                  {signedIn ? "Create the first post" : "Sign in to post"}
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                <MemberPostCard
                  post={post}
                  signedIn={signedIn}
                  onLikeChange={(postId, liked, likeCount) => {
                    setPosts((current) =>
                      current.map((item) =>
                        item.id === postId
                          ? { ...item, likedByViewer: liked, likeCount }
                          : item,
                      ),
                    );
                  }}
                  onDeleted={(postId) => {
                    setPosts((current) =>
                      current.filter((item) => item.id !== postId),
                    );
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <p role="alert" className="px-4 pb-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      {nextCursor ? (
        <div className="px-4 py-4 sm:px-5">
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Loading…" : "Load more posts"}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading more posts…</span>
          <PostSkeleton />
        </div>
      ) : null}
    </section>
  );
}
