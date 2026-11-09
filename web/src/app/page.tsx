import type { Metadata } from "next";
import Link from "next/link";

import { MemberFeed } from "@/components/feed/MemberFeed";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { getPostsService } from "@/modules/posts/provider";
import type { PostPageDto } from "@synergy/domain";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Home" };

/** The feed is per-viewer (own posts, like state): never statically cached. */
export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/discover", label: "Discover", icon: "compass" as const },
  { href: "/communities", label: "Communities", icon: "users" as const },
  { href: "/discover?tab=posts", label: "Posts", icon: "sparkles" as const },
  {
    href: "/discover?tab=creators",
    label: "Creators",
    icon: "briefcase" as const,
  },
];

/**
 * Home: the ecosystem introduction plus the REAL feed (TASK-008A).
 *
 * The first page is rendered on the server from the posts service, so a
 * visitor sees posts immediately and the SQL visibility rule has already been
 * applied. When the development database is not configured, the page says the
 * feed is unavailable instead of substituting demonstration posts.
 */
export default async function HomePage() {
  const session = await getCurrentSession();

  let initial: PostPageDto = { posts: [], nextCursor: null };
  let unavailable = false;
  try {
    initial = await getPostsService().getFeed(session, { limit: 10 });
  } catch {
    unavailable = true;
  }

  return (
    <div>
      <section className="px-4 pb-4 pt-5 sm:px-5">
        <Badge tone="primary">Connect · create · grow</Badge>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink">
          People, creators and services — connected
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          SYNERGY is a Nigeria-first social and commerce ecosystem. Share what
          you are making, find people worth following, and let discovery lead
          somewhere useful.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex min-h-[56px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name={link.icon} className="h-4 w-4 text-primary" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <MemberFeed
        initial={initial}
        signedIn={Boolean(session)}
        unavailable={unavailable}
      />
    </div>
  );
}
