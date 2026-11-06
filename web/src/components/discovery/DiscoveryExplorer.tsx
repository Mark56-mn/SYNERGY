"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CommunityCard } from "@/components/communities/CommunityCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { SearchField } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { VideoCard } from "@/components/videos/VideoCard";
import {
  DEMO_AUTHORS,
  DEMO_COMMUNITIES,
  DEMO_LISTINGS,
  DEMO_VIDEOS,
  formatCount,
} from "@/lib/demo-content";

type DiscoveryTab =
  "people" | "communities" | "videos" | "businesses" | "products";

const TABS: Array<TabItem & { id: DiscoveryTab }> = [
  { id: "people", label: "People" },
  { id: "communities", label: "Communities" },
  { id: "videos", label: "Videos" },
  { id: "businesses", label: "Businesses" },
  { id: "products", label: "Products" },
];

function matches(query: string, ...fields: Array<string | undefined>): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/**
 * Discovery explorer: category tabs plus a LOCAL filter over the demonstration
 * records. It never pretends to query a backend — the search hint says the
 * filtering is limited to demonstration content in this browser.
 */
export function DiscoveryExplorer({ initialTab }: { initialTab?: string }) {
  const startingTab = TABS.some((tab) => tab.id === initialTab)
    ? (initialTab as DiscoveryTab)
    : "people";
  const [tab, setTab] = useState<DiscoveryTab>(startingTab);
  const [query, setQuery] = useState("");

  const people = useMemo(
    () =>
      DEMO_AUTHORS.filter((author) =>
        matches(
          query,
          author.displayName,
          author.handle,
          author.category,
          author.location,
          author.bio,
        ),
      ),
    [query],
  );
  const businesses = useMemo(
    () =>
      DEMO_AUTHORS.filter(
        (author) =>
          author.kind === "business" &&
          matches(
            query,
            author.displayName,
            author.handle,
            author.category,
            author.bio,
          ),
      ),
    [query],
  );
  const communities = useMemo(
    () =>
      DEMO_COMMUNITIES.filter((community) =>
        matches(query, community.name, community.topic, community.description),
      ),
    [query],
  );
  const videos = useMemo(
    () =>
      DEMO_VIDEOS.filter((video) => matches(query, video.title, video.topic)),
    [query],
  );
  const products = useMemo(
    () =>
      DEMO_LISTINGS.filter(
        (listing) =>
          listing.type === "product" &&
          matches(query, listing.title, listing.summary, listing.priceNote),
      ),
    [query],
  );

  const counts: Record<DiscoveryTab, number> = {
    people: people.length,
    communities: communities.length,
    videos: videos.length,
    businesses: businesses.length,
    products: products.length,
  };

  const empty = (
    <EmptyState
      title="No demonstration results"
      description={
        query
          ? `Nothing in the demonstration set matches “${query}”.`
          : "There is nothing to show in this category yet."
      }
      action={
        query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
          >
            Clear search
          </button>
        ) : undefined
      }
    />
  );

  return (
    <div>
      <div className="px-4 pt-4 sm:px-0">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search demonstration content"
        />
        <p className="mt-1.5 text-[11px] text-ink-muted">
          Demonstration search — filters the example records below in your
          browser. No live search service is connected.
        </p>
      </div>

      <Tabs
        items={TABS.map((item) => ({ ...item, count: counts[item.id] }))}
        value={tab}
        onChange={(id) => setTab(id as DiscoveryTab)}
        label="Discovery categories"
        className="mt-3"
      />

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-4 px-4 sm:px-0"
      >
        {/* Results heading keeps h1 → h2 → card h3 order for each category. */}
        <h2 className="sr-only">
          {TABS.find((item) => item.id === tab)?.label ?? "Discovery"} results
        </h2>
        {tab === "people" ? (
          people.length === 0 ? (
            empty
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {people.map((author) => (
                <li key={author.handle}>
                  <article className="flex h-full gap-3 rounded-lg border border-border bg-surface p-4">
                    <Avatar
                      name={author.displayName}
                      seed={author.handle}
                      demo
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/u/${author.handle}`}
                          className="truncate text-sm font-semibold text-ink hover:text-primary"
                        >
                          {author.displayName}
                        </Link>
                        <Badge>{labelForKind(author.kind)}</Badge>
                      </div>
                      <p className="text-xs text-ink-muted">
                        @{author.handle} · {author.category}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                        {author.bio}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {formatCount(author.followers)} followers (demo)
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "businesses" ? (
          businesses.length === 0 ? (
            empty
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {businesses.map((author) => (
                <li key={author.handle}>
                  <article className="flex h-full gap-3 rounded-lg border border-border bg-surface p-4">
                    <Avatar
                      name={author.displayName}
                      seed={author.handle}
                      demo
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/b/${author.handle}`}
                        className="truncate text-sm font-semibold text-ink hover:text-primary"
                      >
                        {author.displayName}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {author.category} · {author.location}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                        {author.bio}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "communities" ? (
          communities.length === 0 ? (
            empty
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {communities.map((community) => (
                <li key={community.slug}>
                  <CommunityCard community={community} />
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "videos" ? (
          videos.length === 0 ? (
            empty
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {videos.map((video) => (
                <li key={video.id}>
                  <VideoCard video={video} />
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "products" ? (
          products.length === 0 ? (
            empty
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {products.map((listing) => (
                <li key={listing.id}>
                  <article className="flex h-full flex-col rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink">
                        {listing.title}
                      </h3>
                      <Badge tone="primary">Product</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {listing.area} · {listing.priceNote} (demo)
                    </p>
                    <p className="mt-2 text-xs leading-5 text-ink-muted">
                      {listing.summary}
                    </p>
                    <p className="mt-3 flex items-center gap-1 text-[11px] text-ink-muted">
                      <Icon name="tag" className="h-3.5 w-3.5" />
                      Enquiries arrive with the marketplace task
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}

function labelForKind(kind: "individual" | "creator" | "business"): string {
  if (kind === "business") {
    return "Business";
  }
  if (kind === "creator") {
    return "Creator";
  }
  return "Individual";
}
