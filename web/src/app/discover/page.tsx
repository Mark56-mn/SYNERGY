import type { Metadata } from "next";

import { DiscoveryExplorer } from "@/components/discovery/DiscoveryExplorer";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : undefined;

  return (
    <div className="pb-6">
      <header className="px-4 pt-5 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Discover</h1>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Find people, communities, videos, businesses and products. Categories
          and search here operate on demonstration data in this build.
        </p>
      </header>
      <DiscoveryExplorer initialTab={tab} />
    </div>
  );
}
