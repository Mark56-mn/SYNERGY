import "server-only";

/**
 * Structured error handling for API routes.
 *
 * - Error RESPONSES to clients carry a stable `code` and a safe, generic or
 *   validation-only message: never internals, never stack traces, never
 *   personal data, never another user's existence/identity unless the API
 *   contract itself says so.
 * - Full details for the server-side log are passed to the logger by the
 *   handler wrapper, where payloads are redacted.
 */

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "service_unavailable"
  | "internal_error";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  // TASK-007: a unique-constraint race (username already claimed) is a client
  // conflict, not a server fault, so it gets its own stable code.
  conflict: 409,
  rate_limited: 429,
  service_unavailable: 503,
  internal_error: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Client-facing message; deliberately free of internals and PII. */
  readonly safeMessage: string;

  constructor(code: ErrorCode, safeMessage: string) {
    super(safeMessage);
    this.name = "AppError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

export function badRequest(
  safeMessage = "The request could not be processed.",
): AppError {
  return new AppError("bad_request", safeMessage);
}

export function unauthorized(safeMessage = "Sign in required."): AppError {
  return new AppError("unauthorized", safeMessage);
}

export function forbidden(
  safeMessage = "You do not have access to this resource.",
): AppError {
  return new AppError("forbidden", safeMessage);
}

export function notFound(safeMessage = "Resource not found."): AppError {
  return new AppError("not_found", safeMessage);
}

export function conflict(
  safeMessage = "That value is already taken.",
): AppError {
  return new AppError("conflict", safeMessage);
}

export function rateLimited(
  safeMessage = "Too many requests. Please try again later.",
): AppError {
  return new AppError("rate_limited", safeMessage);
}

export function internalError(): AppError {
  // Unhandled failures collapse into one generic shape, with real details
  // going to the server-side (redacted) logs only.
  return new AppError(
    "internal_error",
    "Something went wrong. Please try again later.",
  );
}

export function statusForCode(code: ErrorCode): number {
  return STATUS_BY_CODE[code];
}

/** Exact JSON body shape used for error responses. */
export function toErrorBody(error: AppError): {
  error: { code: ErrorCode; message: string };
} {
  return { error: { code: error.code, message: error.safeMessage } };
}
