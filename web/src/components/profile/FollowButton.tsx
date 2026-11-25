"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";
import type { FollowStateDto } from "@synergy/domain";

/**
 * Follow / Following control (TASK-008D).
 *
 * It is deliberately NOT optimistic: the displayed state changes only after the
 * server confirms, and a failure restores the last confirmed state and
 * announces itself with `role="alert"`. Signed-out visitors get a sign-in link
 * instead of a button that silently does nothing.
 */
export function FollowButton({
  username,
  isFollowing,
  signedIn,
  onConfirmed,
}: {
  username: string;
  isFollowing: boolean;
  signedIn: boolean;
  /** Called with the server's confirmed state so counts update in the parent. */
  onConfirmed?: (state: FollowStateDto) => void;
}) {
  const [following, setFollowing] = useState(isFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=%2Fu%2F${encodeURIComponent(username)}`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover focus-visible:outline-none"
      >
        Follow
      </Link>
    );
  }

  async function toggle() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/profiles/${encodeURIComponent(username)}/follow`,
        {
          method: following ? "DELETE" : "POST",
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Your session expired. Sign in again to continue."
            : "Follow could not be updated. Please try again.",
        );
        return;
      }
      const state = (await response.json()) as FollowStateDto;
      setFollowing(state.isFollowing);
      onConfirmed?.(state);
    } catch {
      setError("Network problem — follow was not updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        aria-busy={pending}
        aria-label={following ? `Unfollow @${username}` : `Follow @${username}`}
        className={cn(
          "inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors",
          "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70",
          following
            ? "border border-primary bg-surface-raised text-ink"
            : "bg-primary text-bg hover:bg-primary-hover",
        )}
      >
        {pending ? "Saving…" : following ? "Following" : "Follow"}
      </button>
      {error ? (
        <p
          role="alert"
          className="max-w-[200px] text-right text-xs text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
