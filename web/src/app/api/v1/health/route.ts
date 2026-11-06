/**
 * Public health endpoint. Exposes no user data and no internals: callers get
 * an opaque liveness indicator only.
 */
export async function GET(): Promise<Response> {
  return Response.json(
    { status: "ok", service: "synergy-web" },
    { headers: { "cache-control": "no-store" } },
  );
}
