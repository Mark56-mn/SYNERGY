/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountMenu } from "@/components/shell/AccountMenu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  postAuthJson: vi.fn(async () => ({ status: 200, body: { ok: true } })),
}));

afterEach(cleanup);

describe("mobile account menu (TASK-007F)", () => {
  it("signed-out visitors get Sign in", () => {
    render(<AccountMenu authState={{ signedIn: false }} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
  });

  it("signed-in members get an expandable account menu", () => {
    render(
      <AccountMenu
        authState={{
          signedIn: true,
          avatarUrl: "https://res.cloudinary.com/test/image/upload/a.png",
          displayName: "Ada Okoro",
        }}
      />,
    );
    const button = screen.getByRole("button", { name: "Your account menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menuitem", { name: "My Profile" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Edit Profile" })).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Account Settings" }),
    ).toBeTruthy();
    expect(screen.getAllByAltText("Ada Okoro profile photo")).toHaveLength(2);
  });

  it("renders initials fallback when no photo is saved", () => {
    const { container } = render(
      <AccountMenu
        authState={{ signedIn: true, displayName: "Bola Adeyemi" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Your account menu" }));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getAllByText("BA")).toHaveLength(2);
  });
});
