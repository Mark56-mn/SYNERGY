/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberFeed } from "@/components/feed/MemberFeed";
import type { PostPageDto, PostViewDto } from "@synergy/domain";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const post: PostViewDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  body: "A followed creator's post",
  mediaUrl: null,
  mediaAlt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  timeLabel: "2h",
  topics: [],
  author: {
    username: "ada_okoro",
    displayName: "Ada Okoro",
    avatarUrl: null,
  },
  likeCount: 0,
  likedByViewer: false,
  isOwner: false,
};

describe("Following feed UI", () => {
  it("shows the specified quiet-feed state", () => {
    render(
      <MemberFeed
        initial={{ posts: [], nextCursor: null }}
        signedIn
        scope="following"
      />,
    );
    expect(screen.getByText("Your Following feed is quiet")).toBeTruthy();
    expect(
      screen.getByText("Follow creators to see their posts here."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Explore creators" })
        .getAttribute("href"),
    ).toBe("/discover?tab=creators");
  });

  it("renders the following heading and subtitle", () => {
    render(
      <MemberFeed
        initial={{ posts: [post], nextCursor: null }}
        signedIn
        scope="following"
      />,
    );
    expect(screen.getByRole("heading", { name: "Following" })).toBeTruthy();
    expect(
      screen.getByText("Posts from creators you follow · newest first"),
    ).toBeTruthy();
  });

  it("adds the following scope to load-more requests", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ posts: [], nextCursor: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemberFeed
        initial={{ posts: [post], nextCursor: "cursor-1" } as PostPageDto}
        signedIn
        scope="following"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Load more posts" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/feed?cursor=cursor-1&scope=following",
    );
  });

  it("reports an unavailable following feed instead of simulating posts", () => {
    render(
      <MemberFeed
        initial={{ posts: [], nextCursor: null }}
        signedIn
        unavailable
        scope="following"
      />,
    );
    expect(screen.getByText("The feed is unavailable")).toBeTruthy();
    expect(screen.queryByText("Your Following feed is quiet")).toBeNull();
  });
});
