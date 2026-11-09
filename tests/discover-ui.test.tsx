/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DiscoverExplore } from "@/components/discovery/DiscoverExplore";
import type { DiscoverResultDto, PostViewDto } from "@synergy/domain";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const post: PostViewDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  body: "Finished three shirts today. #tailoring",
  mediaUrl: null,
  mediaAlt: null,
  createdAt: "2026-02-02T00:00:00.000Z",
  timeLabel: "2h",
  topics: ["tailoring"],
  author: {
    username: "ada_okoro",
    displayName: "Ada Okoro",
    avatarUrl: null,
  },
  likeCount: 1,
  likedByViewer: false,
  isOwner: false,
};

const initial: DiscoverResultDto = {
  query: "",
  topic: null,
  posts: [post],
  creators: [
    {
      username: "ada_okoro",
      displayName: "Ada Okoro",
      avatarUrl: null,
      bio: "Tailor in Lagos",
      postCount: 3,
    },
  ],
  topics: [{ topic: "tailoring", postCount: 2 }],
};

const matched: DiscoverResultDto = {
  ...initial,
  query: "tote",
  posts: [
    {
      ...post,
      id: "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb",
      body: "Tote bags restocked",
    },
  ],
};

function jsonResponse(payload: DiscoverResultDto): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("DiscoverExplore", () => {
  it("renders server-provided results, topics and suggested creators", () => {
    render(<DiscoverExplore initial={initial} signedIn />);

    expect(screen.getByText(/Finished three shirts/)).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /#tailoring/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen.getByRole("heading", { name: "Suggested creators" }),
    ).toBeTruthy();
    // The creator appears in the suggested-creators rail and again on the
    // Creators tab, which stays mounted (hidden) for tab switching.
    const creatorLinks = screen.getAllByRole("link", { name: "Ada Okoro" });
    expect(creatorLinks.length).toBeGreaterThan(0);
    for (const link of creatorLinks) {
      expect(link.getAttribute("href")).toBe("/u/ada_okoro");
    }
    expect(screen.getByRole("tab", { name: /Posts/ }).textContent).toContain(
      "1",
    );
  });

  it("searches the API and replaces the results with the answer", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => jsonResponse(matched));
    vi.stubGlobal("fetch", fetchMock);
    render(<DiscoverExplore initial={initial} signedIn={false} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search posts and creators" }),
      "tote",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Tote bags restocked")).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/discover?q=tote");
    expect(window.location.pathname + window.location.search).toBe(
      "/discover?q=tote",
    );
  });

  it("filters by a trending topic and marks the chip pressed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ...initial, topic: "tailoring" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<DiscoverExplore initial={initial} signedIn={false} />);

    await user.click(screen.getByRole("button", { name: /#tailoring/ }));

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /#tailoring/ })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/discover?topic=tailoring",
    );
  });

  it("keeps previous results and explains a failed search", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    render(<DiscoverExplore initial={initial} signedIn />);

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(
      /previous results are still shown/i,
    );
    expect(screen.getByText(/Finished three shirts/)).toBeTruthy();
  });

  it("offers an honest empty state with a way back", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ...initial, query: "zzz", posts: [] })),
    );
    render(<DiscoverExplore initial={initial} signedIn />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search posts and creators" }),
      "zzz",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("No posts match")).toBeTruthy();
    expect(screen.getByText(/No visible posts match “zzz”/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeTruthy();
  });

  it("shows creator matches on the Creators tab", async () => {
    const user = userEvent.setup();
    render(<DiscoverExplore initial={initial} signedIn />);

    await user.click(screen.getByRole("tab", { name: /Creators/ }));

    expect(screen.getAllByText(/Tailor in Lagos/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/@ada_okoro · 3 posts/).length).toBeGreaterThan(
      0,
    );
  });

  it("says discovery is unavailable instead of inventing results", () => {
    render(<DiscoverExplore initial={initial} signedIn unavailable />);
    expect(screen.getByText("Discover is unavailable")).toBeTruthy();
    expect(screen.queryByText(/Finished three shirts/)).toBeNull();
  });
});
