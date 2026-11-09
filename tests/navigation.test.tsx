/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomNav, getPrimaryNavItems } from "@/components/ui/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

describe("primary navigation (TASK-007B)", () => {
  it("signed-in members get their own /profile, never a demo profile", () => {
    const items = getPrimaryNavItems(true);
    const profile = items.find((item) => item.label === "Profile");
    expect(profile?.href).toBe("/profile");
    expect(items.some((item) => item.href.startsWith("/u/"))).toBe(false);
    expect(items.some((item) => item.href.includes("amara"))).toBe(false);
  });

  it("signed-out visitors get a sign-in destination, never a demo profile", () => {
    const items = getPrimaryNavItems(false);
    const profile = items.find((item) => item.label === "Profile");
    expect(profile?.href).toContain("/login");
    expect(items.some((item) => item.href.startsWith("/u/"))).toBe(false);
  });

  it("mobile signed-in bottom bar links to the member's own profile", () => {
    render(<BottomNav authState={{ signedIn: true }} />);
    const profile = screen.getByRole("link", { name: "Profile" });
    expect(profile.getAttribute("href")).toBe("/profile");
  });

  it("mobile signed-out bottom bar offers Sign in, not a fictional profile", () => {
    render(<BottomNav authState={{ signedIn: false }} />);
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn.getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("link", { name: "Profile" })).toBeNull();
  });

  it("desktop signed-in sidebar Profile points to /profile", () => {
    render(<Sidebar authState={{ signedIn: true }} />);
    const profile = screen.getByRole("link", { name: "Profile" });
    expect(profile.getAttribute("href")).toBe("/profile");
    expect(screen.getByRole("link", { name: /your account/i })).toBeTruthy();
  });

  it("desktop signed-out sidebar does not present the demo profile as own", () => {
    render(<Sidebar authState={{ signedIn: false }} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href") ?? "");
    expect(hrefs).not.toContain("/u/amara.makes");
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create account" })).toBeTruthy();
  });

  it("sidebar no longer claims that no profile is stored", () => {
    render(<Sidebar authState={{ signedIn: true }} />);
    expect(document.body.textContent).not.toMatch(/no profile.*stored/i);
    expect(document.body.textContent).toMatch(/saved to your account/i);
  });
});
