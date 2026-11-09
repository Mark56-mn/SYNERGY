import type { Metadata } from "next";

import { DiscoverExplore } from "@/components/discovery/DiscoverExplore";
import { DiscoveryExplorer } from "@/components/discovery/DiscoveryExplorer";
import { getPostsService } from "@/modules/posts/provider";
import type { DiscoverResultDto } from "@synergy/domain";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Discover" };

/** Per-viewer results (ownership/like state): never statically cached. */
export const dynamic = "force-dynamic";

const TOPIC_PATTERN = /^[a-z0-9_]{2,40}$/;
const DEMO_TABS = new Set([
  "people",
  "communities",
  "videos",
  "businesses",
  "products",
]);

function topicFrom(value: string | string[] | undefined): string | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return TOPIC_PATTERN.test(raw) ? raw : null;
}

function text(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Discover (TASK-008C).
 *
 * The real surface — search, posts, creators, trending topics and the topic
 * category filter — is server-rendered from the posts service, so the SQL
 * visibility rule has already been applied before anything reaches the client.
 *
 * The pre-existing demonstration explorer stays below under its own heading:
 * its people/communities/videos/businesses/products are fictional and remain
 * labelled as such, so real results never look like demo data or vice versa.
 * Existing `/discover?tab=videos` links keep working.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = text(params.q).slice(0, 80);
  const topic = topicFrom(params.topic);
  const session = await getCurrentSession();

  let initial: DiscoverResultDto = {
    query,
    topic,
    posts: [],
    creators: [],
    topics: [],
  };
  let unavailable = false;

  try {
    const service = getPostsService();
    const [posts, creators, topics] = await Promise.all([
      service.searchPosts(session, { query, topic, limit: 12 }),
      service.getSuggestedCreators(session, { limit: 6, query }),
      service.getTrendingTopics({ days: 30, limit: 8 }),
    ]);
    initial = { query, topic, posts, creators, topics };
  } catch {
    unavailable = true;
  }

  const requestedTab = text(params.tab) || text(params.demo);
  const demoTab = DEMO_TABS.has(requestedTab) ? requestedTab : undefined;

  return (
    <div className="pb-6">
      <header className="px-4 pt-5 sm:px-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Discover</h1>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Search member posts and public profiles, follow what is trending and
          explore by topic.
        </p>
      </header>

      <DiscoverExplore
        initial={initial}
        signedIn={Boolean(session)}
        unavailable={unavailable}
      />

      <section
        aria-labelledby="demo-directory"
        className="mt-8 border-t border-border px-4 pt-5 sm:px-5"
      >
        <h2
          id="demo-directory"
          className="text-sm font-semibold uppercase tracking-wide text-ink-muted"
        >
          Demonstration directory
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Fictional examples used to illustrate communities, videos, businesses
          and products. They are not real accounts and are not included in
          search results above.
        </p>
        <DiscoveryExplorer initialTab={demoTab} />
      </section>
    </div>
  );
}
