import { describe, expect, it } from "vitest";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  buildAccessOnlyCookie,
  buildAuthSetCookies,
  buildClearCookies,
  parseCookies,
} from "@/server/auth/cookies";

/** TASK-006B — HttpOnly session cookies (names/flags only; no values matter). */

describe("parseCookies", () => {
  it("parses a browser cookie header", () => {
    const jar = parseCookies("a=1; synergy_access_token=tok.abc; b=2");
    expect(jar.get("a")).toBe("1");
    expect(jar.get(ACCESS_COOKIE)).toBe("tok.abc");
    expect(jar.get("b")).toBe("2");
  });

  it("handles null/empty/garbage headers", () => {
    expect(parseCookies(null).size).toBe(0);
    expect(parseCookies("").size).toBe(0);
    expect(parseCookies("no-equals-here; =novalue").size).toBe(0);
  });
});

describe("buildAuthSetCookies", () => {
  it("sets HttpOnly, SameSite, path and Secure cookies with lifetimes", () => {
    const [access, refresh] = buildAuthSetCookies({
      accessToken: "access",
      refreshToken: "refresh",
      accessMaxAgeSeconds: 3600,
      secure: true,
    });

    expect(access).toContain(`${ACCESS_COOKIE}=access`);
    expect(access).toContain("HttpOnly");
    expect(access).toContain("SameSite=Lax");
    expect(access).toContain("Path=/");
    expect(access).toContain("Secure");
    expect(access).toContain("Max-Age=3600");

    expect(refresh).toContain(`${REFRESH_COOKIE}=refresh`);
    expect(refresh).toContain("HttpOnly");
    expect(refresh).toContain("Max-Age=604800");
  });

  it("omits Secure on plain HTTP (local development)", () => {
    const [access] = buildAuthSetCookies({
      accessToken: "access",
      refreshToken: "refresh",
      accessMaxAgeSeconds: 3600,
      secure: false,
    });
    expect(access).not.toContain("Secure");
    expect(access).toContain("HttpOnly");
  });

  it("clamps the access Max-Age into a sane range", () => {
    const [access] = buildAuthSetCookies({
      accessToken: "a",
      refreshToken: "r",
      accessMaxAgeSeconds: 999_999_999,
      secure: false,
    });
    expect(access).toContain("Max-Age=86400");
  });
});

describe("buildAccessOnlyCookie / buildClearCookies", () => {
  it("sets only the access cookie", () => {
    const cookies = buildAccessOnlyCookie({
      accessToken: "a",
      accessMaxAgeSeconds: 600,
      secure: false,
    });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain(`${ACCESS_COOKIE}=a`);
  });

  it("expires both cookies for logout", () => {
    const cookies = buildClearCookies(false);
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toContain("Max-Age=0");
      expect(cookie).toContain("HttpOnly");
    }
  });
});
