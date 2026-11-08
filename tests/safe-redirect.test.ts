import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-redirect";

/** TASK-006B — open-redirect guard for post-auth destinations. */

describe("safeNextPath", () => {
  it("allows same-app relative paths", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/discover?tab=videos")).toBe("/discover?tab=videos");
    expect(safeNextPath("/")).toBe("/");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.example/account")).toBe("/");
    expect(safeNextPath("http://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example/account")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });

  it("rejects schemes, backslashes and control characters", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("/account\\@evil.example")).toBe("/");
    expect(safeNextPath("/account\u0000x")).toBe("/");
  });

  it("rejects auth-screen loops", () => {
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/register?next=/account")).toBe("/");
    expect(safeNextPath("/reset-password")).toBe("/");
    expect(safeNextPath("/auth/callback")).toBe("/");
  });

  it("falls back for missing or non-string values", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(42)).toBe("/");
    expect(safeNextPath("account")).toBe("/");
  });

  it("honours a custom fallback", () => {
    expect(safeNextPath("https://evil.example", "/login")).toBe("/login");
  });
});
