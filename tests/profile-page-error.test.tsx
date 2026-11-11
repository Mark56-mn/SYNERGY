import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOwnProfile = vi.fn();

vi.mock("@/server/provider-access", () => ({
  getCurrentSession: vi.fn(async () => ({
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    roles: ["member"],
  })),
}));

vi.mock("@/modules/profile/provider", () => ({
  getProfileService: () => ({ getOwnProfile }),
}));

import OwnProfilePage from "@/app/profile/page";

beforeEach(() => {
  getOwnProfile.mockReset();
});

describe("own profile page failure recovery", () => {
  it("renders an intentional error state when the profile lookup fails", async () => {
    getOwnProfile.mockRejectedValueOnce(new Error("database unavailable"));
    const html = renderToStaticMarkup(await OwnProfilePage());
    expect(html).toContain("Your profile could not load");
    expect(html).toContain("Try again");
    expect(html).not.toBe("");
  });
});
