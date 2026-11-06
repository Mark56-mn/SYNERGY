import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/feed/PostCard";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/States";
import {
  DEMO_COMMUNITIES,
  DEMO_POSTS,
  formatCount,
  getCommunity,
} from "@/lib/demo-content";

export function generateStaticParams() {
  return DEMO_COMMUNITIES.map((community) => ({ slug: community.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const community = getCommunity(slug);
  return { title: community?.name ?? "Community" };
}

const HOUSE_RULES = [
  "Be specific: say what you need or what you did, with numbers where possible.",
  "No unsolicited selling in threads — listings belong in Discover.",
  "Report rather than retaliate; moderators review reports, not arguments.",
];

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = getCommunity(slug);
  if (!community) {
    notFound();
  }
  const isPrivate = community.visibility === "private";
  const activity = DEMO_POSTS.filter((post) => post.category === "communities");

  return (
    <div className="pb-8">
      <div className="demo-cover h-24 w-full sm:h-28" aria-hidden="true" />
      <div className="px-4 sm:px-5">
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-ink">{community.name}</h1>
          <Badge tone={isPrivate ? "warning" : "primary"}>
            <Icon
              name={isPrivate ? "lock" : "globe"}
              className="mr-1 h-3 w-3"
            />
            {isPrivate ? "Private" : "Public"}
          </Badge>
          <Badge tone="warning">Demo community</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {community.topic} · {formatCount(community.members)} members (demo)
        </p>
        <p className="mt-3 text-sm leading-6 text-ink">
          {community.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-disabled="true"
            aria-describedby="community-join-note"
            className="min-h-[40px] cursor-not-allowed rounded-md border border-dashed border-border px-4 text-sm font-semibold text-ink-muted opacity-70"
          >
            {isPrivate
              ? "Request to join (not available)"
              : "Join (not available)"}
          </button>
          <p id="community-join-note" className="text-[11px] text-ink-muted">
            Membership and approval flows arrive with the community task.
          </p>
        </div>

        <section aria-labelledby="community-rules" className="mt-6">
          <h2 id="community-rules" className="text-base font-semibold text-ink">
            House rules
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink-muted">
            {HOUSE_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="community-activity" className="mt-6">
          <h2
            id="community-activity"
            className="text-base font-semibold text-ink"
          >
            Recent activity
          </h2>
          {isPrivate ? (
            <div className="mt-2">
              <EmptyState
                title="Members-only activity"
                description="Private community posts are only visible to approved members. Approval does not exist in this build, so nothing is shown."
              />
            </div>
          ) : activity.length > 0 ? (
            <div className="-mx-4 mt-2 border-t border-border sm:-mx-5">
              {activity.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <EmptyState
                title="No activity in the sample set"
                description="Demonstration posts for this community have not been added yet."
              />
            </div>
          )}
        </section>

        <p className="mt-6 text-xs text-ink-muted">
          <Link href="/communities" className="text-primary hover:underline">
            ← All communities
          </Link>
        </p>
      </div>
    </div>
  );
}
