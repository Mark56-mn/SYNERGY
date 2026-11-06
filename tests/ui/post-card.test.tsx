/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PostCard } from "@/components/feed/PostCard";
import { DEMO_POSTS } from "@/lib/demo-content";

afterEach(cleanup);

const post = DEMO_POSTS[0]!;

describe("PostCard", () => {
  it("labels the content as demonstration and never claims persistence", () => {
    render(<PostCard post={post} />);
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(screen.getByText(/not saved in this build/i)).toBeTruthy();
  });

  it("marks comment and share as unavailable rather than silently inert", () => {
    render(<PostCard post={post} />);
    expect(
      screen
        .getByRole("button", { name: /comment/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /share/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("toggles the like locally with aria-pressed", async () => {
    const user = userEvent.setup();
    render(<PostCard post={post} />);
    const like = screen.getByRole("button", { name: /like/i });
    expect(like.getAttribute("aria-pressed")).toBe("false");
    await user.click(like);
    expect(like.getAttribute("aria-pressed")).toBe("true");
    await user.click(like);
    expect(like.getAttribute("aria-pressed")).toBe("false");
  });
});
