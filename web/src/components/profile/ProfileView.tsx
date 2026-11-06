"use client";

import { useState } from "react";

import { PostCard } from "@/components/feed/PostCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { formatCount } from "@/lib/demo-content";
import type { DemoAuthor, DemoListing } from "@/lib/demo-content";
import { DEMO_POSTS } from "@/lib/demo-content";

/**
 * Shared profile layout for individual, creator and business accounts. One
 * component keeps the kinds visually consistent while the badge and the
 * listings block distinguish a business without creating a second system.
 *
 * Every statistic is demonstration data and labelled as such; follow/message
 * controls are unavailable rather than silently inert.
 */
export function ProfileView({
  author,
  listings = [],
}: {
  author: DemoAuthor;
  listings?: DemoListing[];
}) {
  const [tab, setTab] = useState("posts");
  const posts = DEMO_POSTS.filter(
    (post) => post.authorHandle === author.handle,
  );
  const mediaPosts = posts.filter((post) => post.media);
  const isBusiness = author.kind === "business";
  const hintId = `profile-${author.handle}-actions`;

  return (
    <div>
      <div className="demo-cover h-28 w-full sm:h-36" aria-hidden="true" />

      <div className="px-4 sm:px-5">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <Avatar
            name={author.displayName}
            seed={author.handle}
            size="xl"
            demo
            className="border-4 border-bg"
          />
          <div className="flex gap-2 pb-1">
            <button
              type="button"
              aria-disabled="true"
              aria-describedby={hintId}
              className="min-h-[40px] cursor-not-allowed rounded-md border border-dashed border-border px-4 text-sm font-semibold text-ink-muted opacity-70"
            >
              Follow
            </button>
            <button
              type="button"
              aria-disabled="true"
              aria-describedby={hintId}
              className="min-h-[40px] cursor-not-allowed rounded-md border border-border px-4 text-sm font-semibold text-ink-muted opacity-70"
            >
              Message
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-ink">{author.displayName}</h1>
          <Badge tone={isBusiness ? "primary" : "neutral"}>
            {isBusiness
              ? "Business"
              : author.kind === "creator"
                ? "Creator"
                : "Individual"}
          </Badge>
          <Badge tone="warning">Demo profile</Badge>
        </div>
        <p className="text-sm text-ink-muted">@{author.handle}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {author.category} · {author.location}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink">{author.bio}</p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {author.capabilities.map((capability) => (
            <li key={capability}>
              <Badge>{capability}</Badge>
            </li>
          ))}
        </ul>

        <dl className="mt-4 flex gap-5 text-sm">
          <div>
            <dt className="sr-only">Posts</dt>
            <dd>
              <span className="font-semibold text-ink">
                {formatCount(author.posts)}
              </span>{" "}
              <span className="text-xs text-ink-muted">posts (demo)</span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Followers</dt>
            <dd>
              <span className="font-semibold text-ink">
                {formatCount(author.followers)}
              </span>{" "}
              <span className="text-xs text-ink-muted">followers (demo)</span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Following</dt>
            <dd>
              <span className="font-semibold text-ink">
                {formatCount(author.following)}
              </span>{" "}
              <span className="text-xs text-ink-muted">following (demo)</span>
            </dd>
          </div>
        </dl>
        <p id={hintId} className="mt-2 text-[11px] leading-4 text-ink-muted">
          Follow and message actions arrive with the identity and messaging
          tasks; this profile is a fictional demonstration account.
        </p>
      </div>

      {isBusiness && listings.length > 0 ? (
        <section
          aria-labelledby="business-listings"
          className="mt-5 px-4 sm:px-5"
        >
          <h2
            id="business-listings"
            className="text-base font-semibold text-ink"
          >
            Services & products
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="rounded-md border border-border bg-surface p-3"
              >
                <p className="text-sm font-medium text-ink">{listing.title}</p>
                <p className="text-xs text-ink-muted">
                  {listing.priceNote} · {listing.area} (demo)
                </p>
                <p className="mt-1 text-xs text-ink-muted">{listing.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Tabs
        items={[
          { id: "posts", label: "Posts", count: posts.length },
          { id: "about", label: "About" },
          { id: "media", label: "Media", count: mediaPosts.length },
        ]}
        value={tab}
        onChange={setTab}
        label={`${author.displayName} profile sections`}
        className="mt-5 px-2 sm:px-3"
      />

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-0"
      >
        {tab === "posts" ? (
          posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-4">
              <EmptyState
                title="No posts yet"
                description="This demonstration account has not published anything in the sample set."
              />
            </div>
          )
        ) : null}

        {tab === "about" ? (
          <div className="space-y-4 px-4 py-5 sm:px-5">
            <section>
              <h2 className="text-sm font-semibold text-ink">About</h2>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {author.bio}
              </p>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-ink">Capabilities</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {author.capabilities.map((capability) => (
                  <li key={capability}>
                    <Badge>{capability}</Badge>
                  </li>
                ))}
              </ul>
            </section>
            <p className="rounded-md border border-border bg-surface p-3 text-xs leading-5 text-ink-muted">
              Demonstration profile. No contact details, private messages or
              verification status are shown or implied, and nothing on this page
              is stored.
            </p>
          </div>
        ) : null}

        {tab === "media" ? (
          mediaPosts.length > 0 ? (
            <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:px-5">
              {mediaPosts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-md border border-border bg-surface p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {post.media?.kind === "video" ? "Video" : "Image"} ·
                    demonstration
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {post.media?.label ?? "Media preview"}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {post.timeLabel}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <EmptyState
                title="No media in the sample set"
                description="This demonstration account has no example images or videos."
              />
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
