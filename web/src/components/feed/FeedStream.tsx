"use client";

import { useEffect, useRef, useState } from "react";

import { PostCard, PostSkeleton } from "@/components/feed/PostCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { DEMO_POSTS, type FeedCategory } from "@/lib/demo-content";

const FEED_TABS: TabItem[] = [
  { id: "all", label: "For you" },
  { id: "local", label: "Local" },
  { id: "creators", label: "Creators" },
  { id: "communities", label: "Communities" },
  { id: "marketplace", label: "Marketplace" },
];

/**
 * The feed is demonstration data filtered in the browser. There is no ranking
 * and no personalisation: "For you" means "all demonstration posts", and the
 * panel says so. The loading preview exercises the skeleton state honestly
 * (it re-renders the same local dataset; no request is made).
 */
export function FeedStream() {
  const [tab, setTab] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const posts =
    tab === "all"
      ? DEMO_POSTS
      : DEMO_POSTS.filter((post) => post.category === (tab as FeedCategory));

  function previewLoading() {
    setLoading(true);
    timer.current = setTimeout(() => setLoading(false), 800);
  }

  return (
    <section aria-labelledby="feed-heading">
      <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
        <h2 id="feed-heading" className="text-base font-semibold text-ink">
          Feed
        </h2>
        <button
          type="button"
          onClick={previewLoading}
          className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-primary"
        >
          Show loading state
        </button>
      </div>

      <Tabs
        items={FEED_TABS}
        value={tab}
        onChange={setTab}
        label="Feed categories"
        className="mt-1 px-2 sm:px-3"
      />

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-0"
      >
        {loading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Loading demonstration posts…</span>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : (
          <>
            <p className="px-4 py-3 text-[11px] text-ink-muted sm:px-5">
              {tab === "all"
                ? "All demonstration posts, newest first. No ranking or personalisation is applied."
                : `Demonstration posts in “${FEED_TABS.find((item) => item.id === tab)?.label ?? tab}”.`}
            </p>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
