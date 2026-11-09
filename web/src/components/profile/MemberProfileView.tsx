"use client";

import Link from "next/link";
import { useState } from "react";

import { MemberPostCard } from "@/components/feed/MemberPostCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import type { PostViewDto } from "@synergy/domain";

/**
 * Profile surface for a REAL member (TASK-007) — distinct from the fictional
 * `ProfileView`, which stays demo-only.
 *
 * Fidelity notes (design references were unavailable in the implementing
 * container, recorded in `handoff/TASK-007.md`): dark navy surfaces, mint
 * accent, compact action row under a cover band, centred avatar with identity
 * and bio, and a switchable content area. Statistics are deliberately NOT
 * fabricated: follower/like counts belong to tasks that implement them, so the
 * tabs show honest empty states instead of invented numbers.
 */

export interface MemberProfileData {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  visibility?: "public" | "private";
}

function ReservedAction({ label, hintId }: { label: string; hintId: string }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-describedby={hintId}
      className="min-h-[40px] cursor-not-allowed rounded-md border border-border px-4 text-sm font-semibold text-ink-muted opacity-70"
    >
      {label}
    </button>
  );
}

export function MemberProfileView({
  profile,
  isOwner,
  posts = [],
  signedIn = false,
}: {
  profile: MemberProfileData;
  isOwner: boolean;
  /** The member's published posts, already visibility-filtered server-side. */
  posts?: PostViewDto[];
  signedIn?: boolean;
}) {
  const [tab, setTab] = useState("about");
  const hintId = `member-profile-${profile.username}-actions`;
  const mediaPosts = posts.filter((post) => post.mediaUrl);

  return (
    <div>
      <div
        className="h-24 w-full bg-gradient-to-br from-primary/20 via-surface to-surface-raised sm:h-32"
        aria-hidden="true"
      />
      <div className="px-4 sm:px-5">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <Avatar
            name={profile.displayName}
            seed={profile.username}
            size="xl"
            src={profile.avatarUrl}
            className="border-4 border-bg"
          />
          {isOwner ? (
            <Link
              href="/profile/edit"
              className="mb-1 inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover focus-visible:outline-none"
            >
              Edit profile
            </Link>
          ) : (
            <div className="flex gap-2 pb-1">
              <ReservedAction label="Follow" hintId={hintId} />
              <ReservedAction label="Message" hintId={hintId} />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-ink">{profile.displayName}</h1>
          {isOwner ? (
            <Badge tone="primary">{isOwner ? "You" : "Member"}</Badge>
          ) : null}
          {isOwner && profile.visibility ? (
            <Badge
              tone={profile.visibility === "public" ? "neutral" : "warning"}
            >
              {profile.visibility === "public" ? "Public" : "Private"}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-ink-muted">@{profile.username}</p>

        {profile.bio ? (
          <p className="mt-3 text-sm leading-6 text-ink">{profile.bio}</p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            {isOwner
              ? "No bio yet — add one from Edit profile."
              : "This member has not added a bio yet."}
          </p>
        )}

        {profile.avatarUrl ? (
          <p className="mt-2 text-xs text-ink-muted">Profile photo.</p>
        ) : null}

        {isOwner && profile.visibility === "private" ? (
          <p className="mt-2 text-xs text-ink-muted">
            Only you can open this profile; other visitors are told it does not
            exist.
          </p>
        ) : null}

        {!isOwner ? (
          <p id={hintId} className="mt-2 text-[11px] leading-4 text-ink-muted">
            Follow and message actions arrive with the community and messaging
            tasks.
          </p>
        ) : null}
      </div>{" "}
      <Tabs
        items={[
          { id: "about", label: "About" },
          { id: "posts", label: "Posts", count: posts.length },
          { id: "media", label: "Media", count: mediaPosts.length },
        ]}
        value={tab}
        onChange={setTab}
        label={`${profile.displayName} profile sections`}
        className="mt-5 px-2 sm:px-3"
      />
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-4 px-4 sm:px-5"
      >
        {tab === "about" ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">About</h2>
            <p className="text-sm leading-6 text-ink-muted">
              {profile.bio ??
                `${profile.displayName} has not written a bio yet.`}
            </p>
            <p className="rounded-md border border-border bg-surface p-3 text-xs leading-5 text-ink-muted">
              This is a real SYNERGY member profile. Email addresses, sign-in
              details and internal identifiers are never shown here.
            </p>
          </section>
        ) : null}

        {tab === "posts" ? (
          posts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description={
                isOwner
                  ? "You have not published anything yet. Your posts appear on this profile and in the home feed."
                  : `${profile.displayName} has not published anything yet.`
              }
              action={
                isOwner ? (
                  <Link
                    href="/compose"
                    className="inline-flex min-h-[40px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover"
                  >
                    Create your first post
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="-mx-4 border-t border-border sm:-mx-5">
              {posts.map((post) => (
                <li key={post.id}>
                  <MemberPostCard post={post} signedIn={signedIn} />
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "media" ? (
          <div className="space-y-4">
            {mediaPosts.length === 0 ? (
              <EmptyState
                title="No photos yet"
                description={
                  isOwner
                    ? "Photos you attach to posts appear here. Your profile photo is managed from Edit profile."
                    : "This member has not shared a post photo yet."
                }
              />
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {mediaPosts.map((post) => (
                  <li key={post.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.mediaUrl!}
                      alt={post.mediaAlt ?? `Photo by ${profile.displayName}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-md border border-border object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
            {profile.avatarUrl ? (
              <p className="text-xs text-ink-muted">
                Your profile photo is managed separately from post photos.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
