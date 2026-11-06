/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs } from "@/components/ui/Tabs";

afterEach(cleanup);

function Harness() {
  const [value, setValue] = useState("alpha");
  return (
    <Tabs
      items={[
        { id: "alpha", label: "Alpha" },
        { id: "beta", label: "Beta" },
        { id: "gamma", label: "Gamma" },
      ]}
      value={value}
      onChange={setValue}
      label="Test categories"
    />
  );
}

describe("Tabs (WAI-ARIA tabs pattern)", () => {
  it("renders a labelled tablist with one selected tab", () => {
    render(<Harness />);
    expect(
      screen.getByRole("tablist", { name: "Test categories" }),
    ).toBeTruthy();
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    expect(alpha.getAttribute("aria-selected")).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Beta" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("selects a tab on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "Beta" }));
    expect(
      screen.getByRole("tab", { name: "Beta" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tab", { name: "Alpha" }).getAttribute("aria-selected"),
    ).toBe("false");
  });

  it("moves focus with arrow keys and supports Home/End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    alpha.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Beta" }),
    );
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Gamma" }),
    );
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Alpha" }),
    );
  });
});
