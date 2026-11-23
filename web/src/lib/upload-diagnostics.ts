/**
 * TASK-008G — browser-side upload diagnostics.
 *
 * The composer used to show one generic message for every image-upload
 * failure. These lines distinguish, in the browser console, what actually
 * happened: no response at all, an HTTP error (with its status), a response
 * that was not JSON, or a success payload without a usable `mediaUrl`.
 *
 * Privacy: the payload is assembled from an allow-list here. It never
 * includes the file name, image bytes, caption, post body, cookies, tokens or
 * the returned media URL. Only a fixed stage, an HTTP status, an elapsed
 * duration and the server's opaque request id may appear.
 */

export const UPLOAD_REQUEST_ID_HEADER = "x-upload-request-id";

export type ClientUploadStage =
  | "fetch_rejected"
  | "unauthorized"
  | "http_error"
  | "parse_failed"
  | "missing_media_url"
  | "succeeded";

export interface ClientUploadDiagnostic {
  stage: ClientUploadStage;
  http_status?: number;
  request_id?: string;
  duration_ms?: number;
}

/** Only a server-generated UUID is accepted; anything else is dropped. */
const OPAQUE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readUploadRequestId(response: Response): string | undefined {
  const value = response.headers.get(UPLOAD_REQUEST_ID_HEADER);
  return value && OPAQUE_ID.test(value) ? value : undefined;
}

export function logUploadDiagnostic(diagnostic: ClientUploadDiagnostic): void {
  const payload: Record<string, string | number> = {
    event: "post_media_upload_client",
    stage: diagnostic.stage,
  };
  if (
    typeof diagnostic.http_status === "number" &&
    Number.isFinite(diagnostic.http_status)
  ) {
    payload.http_status = Math.trunc(diagnostic.http_status);
  }
  if (diagnostic.request_id && OPAQUE_ID.test(diagnostic.request_id)) {
    payload.request_id = diagnostic.request_id;
  }
  if (
    typeof diagnostic.duration_ms === "number" &&
    Number.isFinite(diagnostic.duration_ms)
  ) {
    payload.duration_ms = Math.trunc(diagnostic.duration_ms);
  }
  // One copyable line; `console.warn` keeps it visible without implying a
  // handled application error.
  console.warn(`[synergy-upload] ${JSON.stringify(payload)}`);
}
