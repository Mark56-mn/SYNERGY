/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Dialog } from "@/components/ui/Dialog";

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open composer
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Composer preview"
        description="Nothing is saved."
      >
        <p>Body content</p>
        <button type="button">Inner action</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("traps focus on open and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open composer" }));
    const dialog = screen.getByRole("dialog", { name: "Composer preview" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    // Focus returns to the trigger after closing.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Open composer" }),
    );
  });

  it("closes from the labelled close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open composer" }));
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
