import type { Metadata } from "next";

import { CommunityCard } from "@/components/communities/CommunityCard";
import { DEMO_COMMUNITIES } from "@/lib/demo-content";

export const metadata: Metadata = { title: "Communities" };

export default function CommunitiesPage() {
  return (
    <div className="px-4 pb-8 sm:px-0">
      <header className="pt-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Communities
        </h1>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Working groups for trades, creators and local business in Ibadan.
          Public communities are open to read; private communities show their
          rules and require approval to join.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <p className="text-xs leading-5 text-ink-muted">
          Community membership is not persisted in this build — the cards below
          are demonstration records.
        </p>
        <button
          type="button"
          aria-disabled="true"
          className="min-h-[36px] cursor-not-allowed rounded-md border border-border px-3 text-xs font-semibold text-ink-muted opacity-70"
        >
          Create community (not available)
        </button>
      </div>

      {/* Section heading keeps the document outline in order (h1 → h2 → card h3). */}
      <h2 className="sr-only">Community directory</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {DEMO_COMMUNITIES.map((community) => (
          <li key={community.slug}>
            <CommunityCard community={community} />
          </li>
        ))}
      </ul>
    </div>
  );
}
