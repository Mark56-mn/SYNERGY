/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FollowButton } from "@/components/profile/FollowButton";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FollowButton", () => {
  it("offers sign-in instead of an inert button when signed out", () => {
    render(
      <FollowButton
        username="ada_okoro"
        isFollowing={false}
        signedIn={false}
      />,
    );
    const link = screen.getByRole("link", { name: "Follow" });
    expect(link.getAttribute("href")).toBe("/login?next=%2Fu%2Fada_okoro");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("follows and reports the confirmed state", async () => {
    const user = userEvent.setup();
    const onConfirmed = vi.fn();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            isFollowing: true,
            followerCount: 3,
            followingCount: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FollowButton
        username="ada_okoro"
        isFollowing={false}
        signedIn
        onConfirmed={onConfirmed}
      />,
    );

    const button = screen.getByRole("button", { name: "Follow @ada_okoro" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await user.click(button);

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Unfollow @ada_okoro" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    expect(screen.getByRole("button")).toHaveProperty(
      "textContent",
      "Following",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/profiles/ada_okoro/follow",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onConfirmed).toHaveBeenCalledWith({
      isFollowing: true,
      followerCount: 3,
      followingCount: 1,
    });
  });

  it("unfollows from the Following state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            isFollowing: false,
            followerCount: 2,
            followingCount: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<FollowButton username="ada_okoro" isFollowing signedIn />);

    await user.click(
      screen.getByRole("button", { name: "Unfollow @ada_okoro" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Follow @ada_okoro" }),
      ).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/profiles/ada_okoro/follow",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("keeps the confirmed state and announces a failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );

    render(<FollowButton username="ada_okoro" isFollowing={false} signedIn />);

    await user.click(screen.getByRole("button", { name: "Follow @ada_okoro" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Follow @ada_okoro" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("disables the control while a request is pending", async () => {
    const user = userEvent.setup();
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<FollowButton username="ada_okoro" isFollowing={false} signedIn />);

    await user.click(screen.getByRole("button", { name: "Follow @ada_okoro" }));

    const pending = screen.getByRole("button", { name: "Follow @ada_okoro" });
    expect(pending).toHaveProperty("disabled", true);
    expect(pending.getAttribute("aria-busy")).toBe("true");

    resolveFetch?.(
      new Response(
        JSON.stringify({
          isFollowing: true,
          followerCount: 1,
          followingCount: 0,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Unfollow @ada_okoro" }),
      ).toBeTruthy(),
    );
  });
});
