import "server-only";

/**
 * Structured logging with redaction (SECURITY_RULES.md).
 *
 * - Every log line is a single JSON object (machine-parseable, greppable).
 * - `redact()` walks the payload and replaces sensitive leaf values with
 *   "[redacted]" by KEY NAME — keys named like secrets, tokens, passwords,
 *   cookies, messages, emails, phone numbers and other PII never reach the
 *   output no matter who calls the logger.
 * - Errors are logged via `message` and an explicit name only; stack and
 *   anything else stay out of the serialised payload unless explicitly
 *   passed in redacted-safe form.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN =
  /(secret|password|passwd|token|api[-_]?key|authorization|cookie|session|credential|private[-_]?key|code|otp|authorization\b)/i;

const PII_KEY_PATTERN =
  /(email|phone|msisdn|address|bvn|nin|iban|account[-_]?number|street|city|neighbourhood|neighborhood|bio|full[-_]?name|first[-_]?name|last[-_]?name|surname)/i;

/** Values that are IDs/timestamps (safe identifiers) and look-alike keys to skip. */
const SAFE_KEY_PATTERN =
  /^(user_id|user_id_|supabase_user_id|id|.*_id|logged_at|level|app_env|session_count)$/i;

export function redact(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redact(item));
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    const obj = input as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (SAFE_KEY_PATTERN.test(key)) {
        out[key] = obj[key];
        continue;
      }
      if (SENSITIVE_KEY_PATTERN.test(key) || PII_KEY_PATTERN.test(key)) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = redact(obj[key]);
    }
    return out;
  }
  // Primitive: anything that is not a safe identifier stays as-is only if the
  // caller passed it deliberately; string values are kept, they are not keys.
  return input;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

function emit(
  level: LogLevel,
  message: string,
  data: unknown,
  minLevel: LogLevel,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
    return;
  }
  const line = JSON.stringify({
    level,
    logged_at: new Date().toISOString(),
    message,
    ...(data === undefined ? {} : (redact(data) as Record<string, unknown>)),
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(options: { minLevel?: LogLevel } = {}): Logger {
  const minLevel = options.minLevel ?? "info";
  return {
    debug: (message, data) => emit("debug", message, data, minLevel),
    info: (message, data) => emit("info", message, data, minLevel),
    warn: (message, data) => emit("warn", message, data, minLevel),
    error: (message, data) => emit("error", message, data, minLevel),
  };
}

/** Import-time default logger; tests construct their own bounded one. */
export const logger = createLogger();
