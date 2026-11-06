import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatCount, type DemoCommunity } from "@/lib/demo-content";

/**
 * Community summary card. Membership counts are demonstration values and the
 * join control is explicitly unavailable — no membership is persisted in this
 * build.
 */
export function CommunityCard({
  community,
  className,
}: {
  community: DemoCommunity;
  className?: string;
}) {
  const isPrivate = community.visibility === "private";
  const hintId = `community-${community.slug}-hint`;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-ink">
            <Link
              href={`/communities/${community.slug}`}
              className="hover:text-primary"
            >
              {community.name}
            </Link>
          </h3>
          <p className="text-xs text-ink-muted">{community.topic}</p>
        </div>
        <Badge tone={isPrivate ? "warning" : "primary"}>
          <Icon
            name={isPrivate ? "lock" : "globe"}
            className="mr-1 h-3 w-3"
            aria-hidden="true"
          />
          {isPrivate ? "Private" : "Public"}
        </Badge>
      </div>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
        {community.description}
      </p>

      <p className="mt-3 text-xs text-ink-muted">
        {formatCount(community.members)} members (demo) ·{" "}
        {community.postsThisWeek} posts this week (demo)
      </p>

      <div className="mt-auto pt-4">
        <button
          type="button"
          aria-disabled="true"
          aria-describedby={hintId}
          className="inline-flex min-h-[40px] w-full cursor-not-allowed items-center justify-center rounded-md border border-dashed border-border px-3 text-sm font-semibold text-ink-muted opacity-70"
        >
          {isPrivate
            ? "Request to join (not available)"
            : "Join (not available)"}
        </button>
        <p id={hintId} className="mt-2 text-[11px] leading-4 text-ink-muted">
          Joining arrives with the community task; nothing is stored in this
          build.
        </p>
      </div>
    </article>
  );
}
