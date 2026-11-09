"use client";

import Link from "next/link";
import { useState } from "react";

import { MemberPostCard } from "@/components/feed/MemberPostCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SearchField } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import type {
  CreatorSuggestionDto,
  DiscoverResultDto,
  TrendingTopicDto,
} from "@synergy/domain";

/**
 * Discover (TASK-008C): REAL search over member posts and public profiles,
 * trending topics and a category filter.
 *
 * The initial payload is rendered on the server, so results exist before any
 * JavaScript runs. A search or topic change refetches `/api/v1/discover` and
 * only replaces the panel once the server answers — there is no optimistic
 * result list and no invented match count. Failures keep the previous results
 * visible and say they were not updated.
 *
 * The fictional demonstration directory is a separate section outside this
 * component, so real results are never mixed with demo labelling.
 */

type DiscoverTab = "posts" | "creators" | "topics";

const TABS: Array<{ id: DiscoverTab; label: string }> = [
  { id: "posts", label: "Posts" },
  { id: "creators", label: "Creators" },
  { id: "topics", label: "Topics" },
];

function CreatorCard({ creator }: { creator: CreatorSuggestionDto }) {
  return (
    <article className="flex h-full gap-3 rounded-lg border border-border bg-surface p-4">
      <Avatar
        name={creator.displayName}
        seed={creator.username}
        src={creator.avatarUrl}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/u/${creator.username}`}
            className="truncate text-sm font-semibold text-ink hover:text-primary"
          >
            {creator.displayName}
          </Link>
          <Badge tone="primary">Member</Badge>
        </div>
        <p className="text-xs text-ink-muted">
          @{creator.username} · {creator.postCount}{" "}
          {creator.postCount === 1 ? "post" : "posts"}
        </p>
        {creator.bio ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
            {creator.bio}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function TopicChip({
  topic,
  active,
  onSelect,
}: {
  topic: TrendingTopicDto;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-ink hover:border-primary hover:text-primary",
      )}
    >
      #{topic.topic}
      <span
        className={cn(
          "text-[11px]",
          active ? "text-primary" : "text-ink-muted",
        )}
      >
        {topic.postCount}
      </span>
    </button>
  );
}

export function DiscoverExplore({
  initial,
  signedIn,
  unavailable = false,
}: {
  initial: DiscoverResultDto;
  signedIn: boolean;
  unavailable?: boolean;
}) {
  const [data, setData] = useState<DiscoverResultDto>(initial);
  const [draft, setDraft] = useState(initial.query);
  const [tab, setTab] = useState<DiscoverTab>("posts");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  const activeTopic = data.topic;

  async function load(query: string, topic: string | null) {
    setPending(true);
    setError(null);
    const params = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    if (topic) params.set("topic", topic);
    const suffix = params.toString();
    try {
      const response = await fetch(
        `/api/v1/discover${suffix ? `?${suffix}` : ""}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        setError(
          response.status === 400
            ? "That topic filter is not valid. Clear it and try again."
            : "Search is unavailable right now. Your previous results are still shown.",
        );
        return;
      }
      const next = (await response.json()) as DiscoverResultDto;
      setData(next);
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          suffix ? `/discover?${suffix}` : "/discover",
        );
      }
    } catch {
      setError(
        "Network problem — the results were not updated. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(draft, activeTopic);
  }

  function chooseTopic(topic: string) {
    setTab("posts");
    void load(draft, activeTopic === topic ? null : topic);
  }

  function clearSearch() {
    setDraft("");
    setTab("posts");
    void load("", null);
  }

  if (unavailable) {
    return (
      <section className="px-4 pt-4 sm:px-5">
        <ErrorState
          title="Discover is unavailable"
          description="The development database is not reachable from this deployment, so real posts, creators and topics cannot be shown. The demonstration directory below is separate and still works."
        />
      </section>
    );
  }

  const summary =
    data.query || activeTopic
      ? `${data.posts.length} posts and ${data.creators.length} creators for ${
          activeTopic ? `#${activeTopic}` : `“${data.query}”`
        }.`
      : `${data.posts.length} recent posts, ${data.creators.length} creators to follow and ${data.topics.length} trending topics.`;

  const clearAction = (
    <button
      type="button"
      onClick={clearSearch}
      className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
    >
      Clear search
    </button>
  );

  const postsEmpty = (
    <EmptyState
      title="No posts match"
      description={
        activeTopic
          ? `No visible posts are tagged #${activeTopic} yet. Try another topic or clear the filter.`
          : data.query
            ? `No visible posts match “${data.query}”. Captions, names and #topics are searchable.`
            : "No member posts are visible yet. Posts appear here as members publish."
      }
      action={data.query || activeTopic ? clearAction : undefined}
    />
  );

  const creatorsEmpty = (
    <EmptyState
      title="No creators match"
      description={
        data.query
          ? `No public profiles match “${data.query}”. Only members who made their profile public appear here.`
          : "No other public profiles are available to suggest yet."
      }
      action={data.query ? clearAction : undefined}
    />
  );

  return (
    <div>
      <section
        aria-labelledby="discover-search-heading"
        className="px-4 pt-4 sm:px-5"
      >
        <h2
          id="discover-search-heading"
          className="text-sm font-semibold text-ink"
        >
          Search SYNERGY
        </h2>
        <form
          role="search"
          onSubmit={submit}
          className="mt-2 flex items-stretch gap-2"
        >
          <SearchField
            label="Search posts and creators"
            placeholder="Search posts, people, #topics…"
            value={draft}
            onChange={setDraft}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Searching…" : "Search"}
          </button>
        </form>
        <p className="mt-1.5 text-[11px] leading-5 text-ink-muted">
          Searches real member posts and public profiles on this deployment.
          Private profiles stay out of results. The demonstration directory
          below is fictional and clearly separated.
        </p>

        <p role="status" aria-live="polite" className="sr-only">
          {pending ? "Searching." : summary}
        </p>

        {data.topics.length > 0 ? (
          <div className="mt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Trending topics
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {(showAllTopics ? data.topics : data.topics.slice(0, 6)).map(
                (topic) => (
                  <li key={topic.topic}>
                    <TopicChip
                      topic={topic}
                      active={activeTopic === topic.topic}
                      onSelect={() => chooseTopic(topic.topic)}
                    />
                  </li>
                ),
              )}
              {data.topics.length > 6 ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setShowAllTopics((value) => !value)}
                    className="inline-flex min-h-[36px] items-center rounded-full border border-dashed border-border px-3 text-xs font-medium text-ink-muted hover:border-primary hover:text-primary"
                  >
                    {showAllTopics
                      ? "Fewer topics"
                      : `+${data.topics.length - 6} more`}
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3">
            <ErrorState
              title="Search did not complete"
              description={error}
              retryAction={
                <button
                  type="button"
                  onClick={() => void load(draft, activeTopic)}
                  className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  Try again
                </button>
              }
            />
          </div>
        ) : null}
      </section>

      <Tabs
        items={TABS.map((item) => {
          const count =
            item.id === "posts"
              ? data.posts.length
              : item.id === "creators"
                ? data.creators.length
                : data.topics.length;
          return { id: item.id, label: item.label, count };
        })}
        value={tab}
        onChange={(id) => setTab(id as DiscoverTab)}
        label="Discover results"
        className="mt-4"
      />

      <div className="mt-4 px-4 sm:px-5">
        <div
          role="tabpanel"
          id="panel-posts"
          aria-labelledby="tab-posts"
          hidden={tab !== "posts"}
        >
          <h2 className="sr-only">Posts</h2>
          {pending ? (
            <LoadingState label="Searching posts" />
          ) : data.posts.length === 0 ? (
            postsEmpty
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              {data.posts.map((post) => (
                <MemberPostCard key={post.id} post={post} signedIn={signedIn} />
              ))}
            </div>
          )}

          {!pending ? (
            <section aria-labelledby="suggested-creators" className="mt-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2
                  id="suggested-creators"
                  className="text-sm font-semibold text-ink"
                >
                  {data.query
                    ? "Creators matching your search"
                    : "Suggested creators"}
                </h2>
                <Link
                  href="/discover?tab=creators"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    setTab("creators");
                  }}
                >
                  See all
                </Link>
              </div>
              {data.creators.length === 0 ? (
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {data.query
                    ? `No public profiles match “${data.query}”.`
                    : "No other public profiles are available to suggest yet."}
                </p>
              ) : (
                <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                  {data.creators.slice(0, 4).map((creator) => (
                    <li key={creator.username}>
                      <CreatorCard creator={creator} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <div
          role="tabpanel"
          id="panel-creators"
          aria-labelledby="tab-creators"
          hidden={tab !== "creators"}
        >
          <h2 className="sr-only">Creators</h2>
          {pending ? (
            <LoadingState label="Searching creators" />
          ) : data.creators.length === 0 ? (
            creatorsEmpty
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.creators.map((creator) => (
                <li key={creator.username}>
                  <CreatorCard creator={creator} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          role="tabpanel"
          id="panel-topics"
          aria-labelledby="tab-topics"
          hidden={tab !== "topics"}
        >
          <h2 className="sr-only">Trending topics</h2>
          {pending ? (
            <LoadingState label="Loading topics" />
          ) : data.topics.length === 0 ? (
            <EmptyState
              title="No trending topics yet"
              description="Topics appear when members publish posts with #hashtags. Be the first to start one."
            />
          ) : (
            <ul className="space-y-2">
              {data.topics.map((topic) => (
                <li key={topic.topic}>
                  <button
                    type="button"
                    onClick={() => chooseTopic(topic.topic)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        #{topic.topic}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {topic.postCount} visible{" "}
                        {topic.postCount === 1 ? "post" : "posts"} in the last
                        30 days
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-sm font-semibold text-primary"
                    >
                      Explore →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
