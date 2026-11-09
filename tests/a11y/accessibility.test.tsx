/** @vitest-environment jsdom */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberFeed } from "@/components/feed/MemberFeed";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { DiscoveryExplorer } from "@/components/discovery/DiscoveryExplorer";
import { ProfileView } from "@/components/profile/ProfileView";
import { AppShell } from "@/components/shell/AppShell";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { VideoCard } from "@/components/videos/VideoCard";
import {
  DEMO_AUTHORS,
  DEMO_COMMUNITIES,
  DEMO_LISTINGS,
  DEMO_VIDEOS,
} from "@/lib/demo-content";
import { expectNoA11yViolations } from "../support/axe";

// The shell uses the App Router hook; jsdom has no router, so pin the path.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(cleanup);

/**
 * Automated accessibility coverage for the representative surfaces built in
 * TASK-004. Each component is rendered inside the landmark structure a real
 * page provides (`main` + `h1`), so landmark/heading rules are evaluated in a
 * realistic document rather than being switched off.
 */
describe("accessibility: application shell and navigation", () => {
  it("shell landmarks, headings and navigation have no axe violations", async () => {
    render(
      <AppShell>
        <h1>Home feed</h1>
        <p>Demonstration content.</p>
      </AppShell>,
    );
    await expectNoA11yViolations(document.body);
  });
});

describe("accessibility: feed", () => {
  const feedPost = {
    id: "99999999-9999-4999-8999-999999999999",
    body: "A real member post with a #topic.",
    mediaUrl: null,
    mediaAlt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    timeLabel: "2h",
    topics: ["topic"],
    author: {
      username: "ada_okoro",
      displayName: "Ada Okoro",
      avatarUrl: null,
    },
    likeCount: 3,
    likedByViewer: false,
    isOwner: false,
  };

  it("the real feed's cards, topics and actions pass axe", async () => {
    render(
      <main>
        <h1>Feed</h1>
        <MemberFeed
          initial={{ posts: [feedPost], nextCursor: null }}
          signedIn
        />
      </main>,
    );
    await expectNoA11yViolations(document.body);
  });
});

describe("accessibility: discovery", () => {
  it("search field, tab strip and result cards pass axe", async () => {
    render(
      <main>
        <h1>Discover</h1>
        <DiscoveryExplorer />
      </main>,
    );
    await expectNoA11yViolations(document.body);
  });
});

describe("accessibility: profiles and communities", () => {
  it("a business profile with listings passes axe", async () => {
    const business = DEMO_AUTHORS.find((author) => author.kind === "business");
    expect(business).toBeTruthy();
    const listings = DEMO_LISTINGS.filter(
      (listing) => listing.providerHandle === business!.handle,
    );

    render(
      <main>
        <ProfileView author={business!} listings={listings} />
      </main>,
    );
    await expectNoA11yViolations(document.body);
  });

  it("a community card with a disabled join action passes axe", async () => {
    render(
      <main>
        <h1>Communities</h1>
        <h2>Community directory</h2>
        <CommunityCard community={DEMO_COMMUNITIES[0]!} />
      </main>,
    );
    await expectNoA11yViolations(document.body);
  });
});

describe("accessibility: video and states", () => {
  it("video presentation exposes a labelled, disabled playback control", async () => {
    render(
      <main>
        <h1>Videos</h1>
        <h2>Video picks</h2>
        <VideoCard video={DEMO_VIDEOS[0]!} />
      </main>,
    );
    await expectNoA11yViolations(document.body);
  });

  it("loading, empty and error states pass axe", async () => {
    render(
      <main>
        <h1>States</h1>
        <LoadingState label="Loading demonstration posts…" />
        <EmptyState title="Nothing here yet" description="No records." />
        <ErrorState description="Try again." />
      </main>,
    );
    await expectNoA11yViolations(document.body);
  });
});

describe("accessibility: dialog", () => {
  it("the open composer dialog is labelled, modal and violation-free", async () => {
    render(
      <Dialog
        open
        onClose={() => undefined}
        title="Create a post"
        description="Preview only — nothing is saved."
      >
        <label htmlFor="a11y-body">Post text</label>
        <textarea id="a11y-body" />
      </Dialog>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    await expectNoA11yViolations(document.body);
  });
});
