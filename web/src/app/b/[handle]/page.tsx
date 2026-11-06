import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileView } from "@/components/profile/ProfileView";
import { DEMO_AUTHORS, DEMO_LISTINGS, getAuthor } from "@/lib/demo-content";

export function generateStaticParams() {
  return DEMO_AUTHORS.filter((author) => author.kind === "business").map(
    (author) => ({ handle: author.handle }),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const author = getAuthor(handle);
  return {
    title: author ? `${author.displayName} (demo business)` : "Business",
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const author = getAuthor(handle);
  if (!author || author.kind !== "business") {
    notFound();
  }
  const listings = DEMO_LISTINGS.filter(
    (listing) => listing.providerHandle === author.handle,
  );
  return <ProfileView author={author} listings={listings} />;
}
