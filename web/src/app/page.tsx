import type { Metadata } from "next";
import Link from "next/link";

import { FeedStream } from "@/components/feed/FeedStream";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Home" };

const QUICK_LINKS = [
  { href: "/discover", label: "Discover", icon: "compass" as const },
  { href: "/communities", label: "Communities", icon: "users" as const },
  { href: "/discover?tab=videos", label: "Videos", icon: "play" as const },
  {
    href: "/discover?tab=businesses",
    label: "Businesses",
    icon: "briefcase" as const,
  },
];

/**
 * Home: the ecosystem introduction plus the feed. Everything below the intro
 * is demonstration content (see `demo-content.ts`); no ranking, personalisation
 * or persistence is implied.
 */
export default function HomePage() {
  return (
    <div>
      <section className="px-4 pb-4 pt-5 sm:px-5">
        <Badge tone="primary">Ibadan · foundation build</Badge>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink">
          People, creators and services — connected
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          SYNERGY is a Nigeria-first social and commerce ecosystem. Discovery
          should lead somewhere useful: a person to follow, a community to join,
          a local service that answers.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex min-h-[56px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name={link.icon} className="h-4 w-4 text-primary" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FeedStream />
    </div>
  );
}
