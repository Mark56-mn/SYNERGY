import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  parseCookies,
} from "./server/auth/cookies";
import { refreshSessionIfNeeded } from "./server/auth/session-refresh";

/**
 * Session freshness middleware (TASK-006B).
 *
 * When a request carries a session cookie whose access token is expired (or
 * missing) but a refresh token is present, this asks Supabase Auth for a
 * fresh pair and writes it back as HttpOnly cookies. It makes NO
 * authentication decision: every page and API route still verifies the
 * access token server-side before trusting it.
 *
 * When the provider refuses the refresh token, the cookies are cleared so a
 * dead session cannot linger. When the provider is unreachable, the cookies
 * are left untouched and the downstream verifier denies that request.
 *
 * Edge-safe by construction: only the cookie/refresh helpers (no
 * `server-only` modules) are imported here. Env is read directly because the
 * edge runtime cannot use the Node composition root; only variable NAMES
 * appear in code, never values.
 */
export async function middleware(request: NextRequest) {
  const url = process.env["SUPABASE_AUTH_URL"];
  const anonKey = process.env["SUPABASE_AUTH_ANON_KEY"];
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const jar = parseCookies(request.headers.get("cookie"));
  const accessToken = jar.get(ACCESS_COOKIE) ?? null;
  const refreshToken = jar.get(REFRESH_COOKIE) ?? null;
  if (!accessToken && !refreshToken) {
    return NextResponse.next();
  }

  const result = await refreshSessionIfNeeded({
    accessToken,
    refreshToken,
    url,
    anonKey,
  });

  const secure = request.nextUrl.protocol === "https:";

  if (result.kind === "refreshed") {
    // Forward the fresh cookies to downstream handlers too, so rules that
    // run in this same request (e.g. API routes) see the new access token.
    const requestHeaders = new Headers(request.headers);
    const entries = Array.from(jar.entries());
    const set = (name: string, value: string) => {
      const index = entries.findIndex(([entryName]) => entryName === name);
      if (index >= 0) {
        entries[index] = [name, value];
      } else {
        entries.push([name, value]);
      }
    };
    set(ACCESS_COOKIE, result.accessToken);
    set(REFRESH_COOKIE, result.refreshToken);
    requestHeaders.set(
      "cookie",
      entries.map(([name, value]) => `${name}=${value}`).join("; "),
    );

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.cookies.set(ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: result.expiresIn,
    });
    response.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  if (result.kind === "clear") {
    const response = NextResponse.next();
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
      response.cookies.set(name, "", {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
