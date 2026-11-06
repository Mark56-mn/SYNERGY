import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import {
  DEMO_COMMUNITIES,
  DEMO_VIDEOS,
  formatCount,
  getAuthor,
} from "@/lib/demo-content";

const TOPICS = [
  { label: "Creators", href: "/discover?tab=people" },
  { label: "Communities", href: "/discover?tab=communities" },
  { label: "Services", href: "/discover?tab=businesses" },
  { label: "Products", href: "/discover?tab=products" },
];

/** Desktop contextual column: topics, communities and video picks. */
export function RightRail() {
  return (
    <aside
      aria-label="Explore and suggestions"
      className="hidden w-rail shrink-0 space-y-4 pt-6 xl:block"
    >
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Explore</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <li key={topic.label}>
              <Link
                href={topic.href}
                className="inline-flex min-h-[32px] items-center rounded-full border border-border bg-surface-raised px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary hover:text-primary"
              >
                {topic.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Communities to watch
          </h2>
          <Link
            href="/communities"
            className="text-xs font-medium text-primary hover:underline"
          >
            All
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {DEMO_COMMUNITIES.slice(0, 2).map((community) => (
            <li key={community.slug}>
              <Link
                href={`/communities/${community.slug}`}
                className="group block rounded-md p-1 hover:bg-surface-raised"
              >
                <p className="text-sm font-medium text-ink group-hover:text-primary">
                  {community.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {community.visibility === "private" ? "Private" : "Public"} ·{" "}
                  {formatCount(community.members)} members (demo)
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Video picks</h2>
        <ul className="mt-3 space-y-3">
          {DEMO_VIDEOS.slice(0, 2).map((video) => {
            const author = getAuthor(video.authorHandle);
            return (
              <li key={video.id} className="flex items-start gap-2">
                <Avatar
                  name={author?.displayName ?? video.authorHandle}
                  seed={video.authorHandle}
                  size="sm"
                  demo
                />
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{video.title}</p>
                  <p className="text-xs text-ink-muted">
                    {video.durationLabel} · {video.viewsLabel} (demo)
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <Link
          href="/discover?tab=videos"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          More videos
          <Icon name="arrow-right" className="h-3.5 w-3.5" />
        </Link>
      </section>

      <p className="px-1 text-[11px] leading-5 text-ink-muted">
        Demonstration content only. Nothing here is a real member, listing or
        transaction.
      </p>
    </aside>
  );
}
