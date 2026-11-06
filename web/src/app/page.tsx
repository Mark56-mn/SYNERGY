import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";

/**
 * Landing page for the application foundation.
 *
 * Honest by construction: it describes the planned ecosystem direction; it
 * contains NO fake marketplace data, NO fake user accounts, and NO fake
 * business profiles (DESIGN_SYSTEM.md use-realistic-content rule). Feature
 * surfaces (feed, marketplace, communities) arrive with their own tasks and
 * are shown here only as the product domains they will belong to.
 */

const PRODUCT_DOMAINS: Array<{ title: string; body: string; badge: string }> = [
  {
    title: "Social feed",
    body: "Follow people and creators you genuinely care about, with a chronological-following option and user controls built in.",
    badge: "Coming",
  },
  {
    title: "Communities",
    body: "Public, private and hidden communities with roles, rules and moderation foundations — safe by design.",
    badge: "Coming",
  },
  {
    title: "Services & products",
    body: "Individual and business providers publish service areas and listings; enquiries reach real providers, not clones.",
    badge: "Coming",
  },
  {
    title: "Creators & discovery",
    body: "Creators earn from a transparent advertising-revenue pool; discovery leads to people and businesses, not just noise.",
    badge: "Coming",
  },
];

function Section({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & Omit<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>,
  "children"
>) {
  return (
    <section
      className={`page-container py-10 sm:py-14 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="page-container flex h-16 items-center justify-between">
          <a
            href="#main-content"
            className="text-lg font-bold tracking-tight text-primary"
            aria-label="SYNERGY home"
          >
            SYNERGY
          </a>
          <nav aria-label="Landing">
            <ul className="flex items-center gap-4 text-sm text-ink-muted">
              <li>
                <a className="hover:text-primary" href="#product">
                  Product
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="#launch">
                  Launch
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <Section className="text-center">
          <Badge tone="primary" className="mb-4">
            Foundation phase
          </Badge>
          <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            Discover people, creators, communities, services and products
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
            SYNERGY is a Nigeria-first social and commerce ecosystem. Content
            discovery should lead to useful relationships, communities, service
            providers and products — not an isolated entertainment feed.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink
              href="#product"
              aria-label="Read about the SYNERGY product"
            >
              See what we are building
            </ButtonLink>
            <ButtonLink
              href="#launch"
              variant="secondary"
              aria-label="Learn about the controlled launch"
            >
              Controlled launch in Ibadan
            </ButtonLink>
          </div>
        </Section>

        {/* Product domains */}
        <Section id="product" className="pt-2">
          <h2 className="text-2xl font-bold text-ink">
            One ecosystem, four connected surfaces
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Discovery, community, creator opportunity and marketplace are
            designed as one integrated product — with privacy and safety built
            into the foundation, not bolted on later.
          </p>{" "}
          <ul
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            role="list"
          >
            {PRODUCT_DOMAINS.map((d) => (
              <li key={d.title} className="contents">
                <Card className="flex flex-col">
                  <CardTitle>{d.title}</CardTitle>
                  <CardBody>{d.body}</CardBody>
                  <div className="mt-auto pt-4">
                    <Badge>{d.badge}</Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        {/* Launch */}
        <Section id="launch" className="pt-0">
          <Card className="bg-surface-raised">
            <CardTitle>Controlled launch: Ibadan, Nigeria</CardTitle>
            <CardBody>
              The first release is a validated, controlled launch in Ibadan —
              with authentication, privacy, reporting and moderation foundations
              tested before anything goes public. Web first, with Android
              development running on the same shared contracts. Payments stay
              out of the first scope entirely.
            </CardBody>
          </Card>
        </Section>
      </main>

      <footer className="border-t border-border bg-surface py-8">
        <div className="page-container flex flex-col items-start justify-between gap-2 text-sm text-ink-muted sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} SYNERGY. Foundation phase.</p>
          <p>Dark navy · Mint green · Ibadan-first.</p>
        </div>
      </footer>
    </>
  );
}
