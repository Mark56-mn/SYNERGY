/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DiscoveryExplorer } from "@/components/discovery/DiscoveryExplorer";

afterEach(cleanup);

describe("DiscoveryExplorer", () => {
  it("filters demonstration people locally", async () => {
    const user = userEvent.setup();
    render(<DiscoveryExplorer />);

    expect(screen.getByRole("link", { name: "Amara O." })).toBeTruthy();
    const search = screen.getByRole("searchbox", {
      name: /search demonstration content/i,
    });
    await user.type(search, "homefix");

    expect(screen.queryByRole("link", { name: "Amara O." })).toBeNull();
    expect(screen.getByRole("link", { name: "Bola Homefix" })).toBeTruthy();
  });

  it("shows an honest empty state with a way back", async () => {
    const user = userEvent.setup();
    render(<DiscoveryExplorer />);
    const search = screen.getByRole("searchbox", {
      name: /search demonstration content/i,
    });
    await user.type(search, "no-such-record");
    expect(screen.getByText("No demonstration results")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("link", { name: "Amara O." })).toBeTruthy();
  });

  it("switches to businesses with the correct profile route", async () => {
    const user = userEvent.setup();
    render(<DiscoveryExplorer />);
    await user.click(screen.getByRole("tab", { name: /businesses/i }));
    const businessLink = screen.getByRole("link", { name: "Bola Homefix" });
    expect(businessLink.getAttribute("href")).toBe("/b/bola.homefix");
  });
});
