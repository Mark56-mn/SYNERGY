import "server-only";

import { randomUUID } from "node:crypto";

import type { ProviderFailureReason } from "@/server/media/image-upload";
import { logger, type LogLevel } from "@/server/logging";

/**
 * TASK-008G — safe, correlated diagnostics for the post-photo upload path.
 *
 * Why this exists: on the Vercel Preview a photo post failed with the generic
 * "Network problem" message while text-only posts worked, and the server
 * collapsed every provider failure into one 500. This module makes the last
 * reached stage and the failure class observable without exposing anything
 * sensitive.
 *
 * Rules enforced here, not by convention:
 *
 * 1. Every request gets an opaque server-generated `request_id` (a UUID). It
 *    is returned in the `x-upload-request-id` response header so a browser
 *    failure can be correlated with one Vercel log line.
 * 2. Only allow-listed field NAMES are emitted, and scalar values must be a
 *    boolean, a finite number, or a short `[a-z0-9_.:-]` token. URLs, email
 *    addresses, filenames, captions, raw provider bodies, tokens and secrets
 *    cannot pass that filter even if a caller passes them by mistake.
 * 3. A single stable event name keeps the log stream greppable and low-noise.
 */

export const UPLOAD_REQUEST_ID_HEADER = "x-upload-request-id";

/** Stable, greppable event name for every post-media-upload log line. */
export const UPLOAD_DIAGNOSTIC_EVENT = "post_media_upload";

/**
 * Stage model (task §4). Low cardinality and fixed: one value per meaningful
 * transition, never one per internal function call.
 */
export type UploadStage =
  | "received"
  | "origin_rejected"
  | "auth_denied"
  | "authorized"
  | "config_missing"
  | "config_present"
  | "body_unreadable"
  | "file_missing"
  | "validation_failed"
  | "validation_passed"
  | "provider_started"
  | "provider_succeeded"
  | "provider_failed"
  | "internal_failed"
  | "completed";

export type SizeBucket =
  "under_64kb" | "under_256kb" | "under_1mb" | "under_4mb" | "over_4mb";

/** Validated image category only — never the client-supplied MIME string. */
export type MimeCategory = "jpeg" | "png" | "webp";

/** The complete allow-list of diagnostic fields. Nothing else is emitted. */
export interface UploadDiagnosticFields {
  request_id: string;
  http_status?: number;
  duration_ms?: number;
  mime_category?: MimeCategory;
  size_bucket?: SizeBucket;
  config_present?: boolean;
  provider_status?: number;
  provider_reason?: ProviderFailureReason;
}

const ALLOWED_FIELDS = [
  "request_id",
  "http_status",
  "duration_ms",
  "mime_category",
  "size_bucket",
  "config_present",
  "provider_status",
  "provider_reason",
] as const satisfies readonly (keyof UploadDiagnosticFields)[];

/**
 * A safe scalar is a boolean, a finite number, or a short lowercase token.
 * Deliberately rejects `/`, spaces, `@`, `%`, `?`, `=` and long values so a
 * URL, filename, caption or credential cannot be logged by accident.
 */
const SAFE_SCALAR = /^[a-z0-9_.:-]{1,48}$/;

function safeScalar(value: unknown): string | number | boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  }
  if (typeof value === "string") {
    return SAFE_SCALAR.test(value) ? value : undefined;
  }
  return undefined;
}

/** Opaque, non-identifying correlation id (never derived from user data). */
export function newUploadRequestId(): string {
  return randomUUID();
}

/** Coarse size class; the exact file contents are never logged. */
export function sizeBucketFor(bytes: number): SizeBucket {
  if (bytes < 64 * 1024) return "under_64kb";
  if (bytes < 256 * 1024) return "under_256kb";
  if (bytes < 1024 * 1024) return "under_1mb";
  if (bytes < 4 * 1024 * 1024) return "under_4mb";
  return "over_4mb";
}

/** Map a sniffed MIME type to its fixed low-cardinality category. */
export function mimeCategory(mime: string): MimeCategory {
  if (mime === "image/jpeg") return "jpeg";
  if (mime === "image/webp") return "webp";
  return "png";
}

/** Emit one allow-listed, redaction-safe structured line. */
export function logUploadStage(
  stage: UploadStage,
  fields: UploadDiagnosticFields,
  level: LogLevel = "info",
): void {
  const payload: Record<string, string | number | boolean> = { stage };
  for (const key of ALLOWED_FIELDS) {
    const value = safeScalar(fields[key]);
    if (value !== undefined) {
      payload[key] = value;
    }
  }
  logger[level](UPLOAD_DIAGNOSTIC_EVENT, payload);
}
