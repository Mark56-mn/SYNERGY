/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MemberProfileView } from "@/components/profile/MemberProfileView";
import { Avatar } from "@/components/ui/Avatar";

afterEach(cleanup);

const PROFILE = {
  username: "synergy",
  displayName: "Ofoye Emmanuel",
  bio: "I am a prompt responder",
  avatarUrl: "https://res.cloudinary.com/example/image/upload/avatar.png",
  visibility: "public" as const,
};

describe("member profile photo viewer", () => {
  it("opens a full-screen viewer from the avatar and closes with the close control", async () => {
    const user = userEvent.setup();
    render(<MemberProfileView profile={PROFILE} isOwner />);

    await user.click(
      screen.getByRole("button", {
        name: /expand ofoye emmanuel profile photo/i,
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: /ofoye emmanuel profile photo/i,
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: /close dialog/i }));
    expect(
      screen.queryByRole("dialog", { name: /ofoye emmanuel profile photo/i }),
    ).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    render(<MemberProfileView profile={PROFILE} isOwner />);
    await user.click(
      screen.getByRole("button", {
        name: /expand ofoye emmanuel profile photo/i,
      }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<MemberProfileView profile={PROFILE} isOwner />);
    await user.click(
      screen.getByRole("button", {
        name: /expand ofoye emmanuel profile photo/i,
      }),
    );
    const backdrop = document.querySelector(".bg-overlay");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open an empty viewer when there is no photo", () => {
    render(
      <MemberProfileView profile={{ ...PROFILE, avatarUrl: null }} isOwner />,
    );
    expect(
      screen.queryByRole("button", { name: /expand .* profile photo/i }),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("avatar unusable-image fallback", () => {
  it("falls back to initials when the image fails to load", () => {
    render(
      <Avatar name="Ofoye Emmanuel" seed="synergy" src={PROFILE.avatarUrl} />,
    );
    const image = screen.getByRole("img", { name: /profile photo/i });
    fireEvent.error(image);
    expect(screen.queryByRole("img", { name: /profile photo/i })).toBeNull();
    expect(screen.getByRole("img", { name: "Ofoye Emmanuel" })).toBeTruthy();
  });

  it("falls back to initials for a 1×1 placeholder image", () => {
    render(
      <Avatar name="Ofoye Emmanuel" seed="synergy" src={PROFILE.avatarUrl} />,
    );
    const image = screen.getByRole("img", { name: /profile photo/i });
    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      value: 1,
    });
    fireEvent.load(image);
    expect(screen.getByRole("img", { name: "Ofoye Emmanuel" })).toBeTruthy();
  });
});
