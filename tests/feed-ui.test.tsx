/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberFeed } from "@/components/feed/MemberFeed";
import type { PostPageDto, PostViewDto } from "@synergy/domain";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const post: PostViewDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  body: "Finished three shirts today. #tailoring",
  mediaUrl: null,
  mediaAlt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  timeLabel: "2h",
  topics: ["tailoring"],
  author: {
    username: "ada_okoro",
    displayName: "Ada Okoro",
    avatarUrl: null,
  },
  likeCount: 2,
  likedByViewer: false,
  isOwner: false,
};

const page: PostPageDto = { posts: [post], nextCursor: null };

describe("MemberFeed", () => {
  it("renders real posts with a topic link and no demo labelling", () => {
    render(<MemberFeed initial={page} signedIn />);
    expect(screen.getByText(/Finished three shirts/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "#tailoring" }).getAttribute("href"),
    ).toBe("/discover?topic=tailoring");
    expect(screen.queryByText("Demo")).toBeNull();
  });

  it("offers sign-in instead of a like button when signed out", () => {
    render(<MemberFeed initial={page} signedIn={false} />);
    expect(screen.getByRole("link", { name: /sign in to like/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^like/i })).toBeNull();
  });

  it("shows an honest empty state with the next action", () => {
    render(
      <MemberFeed initial={{ posts: [], nextCursor: null }} signedIn={false} />,
    );
    expect(screen.getByText("No posts yet")).toBeTruthy();
    const actions = screen.getAllByRole("link", { name: "Sign in to post" });
    // Header action and the empty-state action both lead to the same place.
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      expect(action.getAttribute("href")).toBe("/login?next=%2Fcompose");
    }
  });

  it("reports an unavailable feed instead of simulating posts", () => {
    render(
      <MemberFeed
        initial={{ posts: [], nextCursor: null }}
        signedIn
        unavailable
      />,
    );
    expect(screen.getByText("The feed is unavailable")).toBeTruthy();
    expect(screen.queryByText("No posts yet")).toBeNull();
  });

  it("persists a like and updates the count", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ likeCount: 3, liked: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberFeed initial={page} signedIn />);

    const like = screen.getByRole("button", { name: /like/i });
    expect(like.getAttribute("aria-pressed")).toBe("false");
    await user.click(like);

    await waitFor(() => expect(like.getAttribute("aria-pressed")).toBe("true"));
    expect(like.textContent).toContain("3");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/posts/${post.id}/like`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("loads the next page with the cursor and appends it", async () => {
    const user = userEvent.setup();
    const second: PostViewDto = {
      ...post,
      id: "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb",
      body: "Second page post",
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ posts: [second], nextCursor: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemberFeed
        initial={{ posts: [post], nextCursor: "cursor-1" }}
        signedIn
      />,
    );

    await user.click(screen.getByRole("button", { name: "Load more posts" }));

    expect(await screen.findByText("Second page post")).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/feed?cursor=cursor-1");
    expect(
      screen.queryByRole("button", { name: "Load more posts" }),
    ).toBeNull();
  });

  it("reports a failed like without pretending it was saved", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    render(<MemberFeed initial={page} signedIn />);

    await user.click(screen.getByRole("button", { name: /like/i }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/not saved/i);
    expect(
      screen
        .getByRole("button", { name: /like/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
