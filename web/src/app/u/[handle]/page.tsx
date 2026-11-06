import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileView } from "@/components/profile/ProfileView";
import { DEMO_AUTHORS, getAuthor } from "@/lib/demo-content";

export function generateStaticParams() {
  return DEMO_AUTHORS.filter((author) => author.kind !== "business").map(
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
  return { title: author ? `${author.displayName} (demo)` : "Profile" };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const author = getAuthor(handle);
  if (!author || author.kind === "business") {
    notFound();
  }
  return <ProfileView author={author} />;
}
