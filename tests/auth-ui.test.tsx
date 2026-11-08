/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ResetPasswordFlow } from "@/components/auth/ResetPasswordFlow";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function mockFetch(
  response: { status: number; body: unknown } | "reject" | "never",
) {
  const fetchMock =
    response === "never"
      ? vi.fn(() => new Promise<Response>(() => undefined))
      : response === "reject"
        ? vi.fn(() => Promise.reject(new TypeError("network down")))
        : vi.fn(
            async () =>
              new Response(JSON.stringify(response.body), {
                status: response.status,
                headers: { "content-type": "application/json" },
              }),
          );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("LoginForm", () => {
  it("shows field errors for an empty submit and never calls the API", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ status: 200, body: { ok: true } });
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in and reports the validated destination", async () => {
    const user = userEvent.setup();
    mockFetch({ status: 200, body: { ok: true, next: "/account" } });
    const onSuccess = vi.fn();
    render(<LoginForm next="/account" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "someone@example.test");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("/account"));
  });

  it("shows the generic invalid-credentials message on 401", async () => {
    const user = userEvent.setup();
    mockFetch({
      status: 401,
      body: {
        error: { code: "unauthorized", message: "Invalid email or password." },
      },
    });
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "someone@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Invalid email or password.",
    );
  });

  it("disables the form while submitting", async () => {
    const user = userEvent.setup();
    mockFetch("never");
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "someone@example.test");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Signing in…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows a generic message when the network fails", async () => {
    const user = userEvent.setup();
    mockFetch("reject");
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "someone@example.test");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(
      /couldn't sign you in/i,
    );
  });
});

describe("RegisterForm", () => {
  it("rejects mismatched and weak passwords client-side", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ status: 200, body: { ok: true } });
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "new@example.test");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Use at least 8 characters.")).toBeTruthy();
    expect(screen.getByText("Passwords don't match.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the confirmation-required state instead of pretending success", async () => {
    const user = userEvent.setup();
    mockFetch({
      status: 200,
      body: { ok: true, status: "confirmation-required" },
    });
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "new@example.test");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.type(screen.getByLabelText("Confirm password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/check your email/i);
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });

  it("reports immediate sign-in through the callback", async () => {
    const user = userEvent.setup();
    mockFetch({ status: 200, body: { ok: true, status: "signed-in" } });
    const onSignedIn = vi.fn();
    render(<RegisterForm onSignedIn={onSignedIn} />);

    await user.type(screen.getByLabelText("Email"), "new@example.test");
    await user.type(screen.getByLabelText("Password"), "password-123");
    await user.type(screen.getByLabelText("Confirm password"), "password-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  });
});

describe("ForgotPasswordForm", () => {
  it("always confirms without revealing account existence", async () => {
    const user = userEvent.setup();
    mockFetch({ status: 200, body: { ok: true } });
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "anyone@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/on its way/i);
  });

  it("rejects an invalid email format", async () => {
    const user = userEvent.setup();
    mockFetch({ status: 200, body: { ok: true } });
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
  });
});

describe("PasswordField", () => {
  it("toggles visibility with an accessible pressed state", async () => {
    const user = userEvent.setup();
    render(
      <PasswordField
        label="Password"
        value="secret-value"
        onChange={() => undefined}
      />,
    );

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(toggle);
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
    expect(input.value).toBe("secret-value");
  });
});

describe("ResetPasswordFlow", () => {
  it("shows the form directly when a session already exists", () => {
    render(<ResetPasswordFlow hasSession />);
    expect(screen.getByLabelText("New password")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeTruthy();
  });

  it("shows the expired-link state when no session and no hash exist", () => {
    render(<ResetPasswordFlow hasSession={false} />);
    expect(
      screen.getByRole("link", { name: "Request a new reset link" }),
    ).toBeTruthy();
  });

  it("establishes the session from a recovery hash, then shows the form", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      "",
      "/reset-password#access_token=good&expires_in=3600",
    );
    const fetchMock = mockFetch({ status: 200, body: { ok: true } });
    render(<ResetPasswordFlow hasSession={false} />);

    expect(await screen.findByLabelText("New password")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({ accessToken: "good" });
    expect(window.location.hash).toBe("");
    void user;
  });

  it("shows the expired state when the hash token is rejected", async () => {
    window.history.replaceState(null, "", "/reset-password#access_token=bad");
    mockFetch({
      status: 401,
      body: { error: { code: "unauthorized", message: "expired" } },
    });
    render(<ResetPasswordFlow hasSession={false} />);

    expect(
      await screen.findByRole("link", { name: "Request a new reset link" }),
    ).toBeTruthy();
  });
});

describe("LogoutButton", () => {
  it("calls logout once and reports success", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ status: 200, body: { ok: true } });
    const onLogout = vi.fn();
    render(<LogoutButton onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate submissions while in flight", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch("never");
    render(<LogoutButton onLogout={() => undefined} />);

    const button = screen.getByRole("button", { name: "Sign out" });
    await user.click(button);
    expect(
      (
        screen.getByRole("button", {
          name: "Signing out…",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    // A second click cannot happen on a disabled button and the ref guard
    // covers anything that lands before re-render.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an honest error when logout fails", async () => {
    const user = userEvent.setup();
    mockFetch("reject");
    render(<LogoutButton onLogout={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/couldn't sign out/i);
  });
});
