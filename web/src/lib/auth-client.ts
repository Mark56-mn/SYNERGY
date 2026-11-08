/**
 * Browser-side caller for the SYNERGY auth API (TASK-006B).
 *
 * Client-safe: this module knows nothing about Supabase, the anon key, or
 * credentials — it only POSTs JSON to our own same-origin endpoints and
 * parses the uniform `{ ok, ... }` / `{ error: { code, message } }` shapes.
 * Cookies are HttpOnly and managed by the server; the browser never handles
 * a token. Error messages shown to users come from the server's safe
 * messages or from the generic fallbacks below — never from provider
 * internals.
 */

export interface AuthApiResult {
  status: number;
  /** Parsed body when the response was JSON; `null` otherwise. */
  body: Record<string, unknown> | null;
}

/** Safely pull the server-provided error message, if there is one. */
export function serverErrorMessage(
  result: AuthApiResult,
  fallback: string,
): string {
  const error = result.body?.["error"];
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

export async function postAuthJson(
  path: string,
  payload: Record<string, unknown>,
): Promise<AuthApiResult> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
  } catch {
    // Network failure: no server message exists. Callers show their generic
    // "try again" copy; nothing here can leak provider detail.
    return { status: 0, body: null };
  }
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = null;
  }
  return { status: response.status, body };
}
