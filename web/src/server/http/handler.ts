import "server-only";

import type { z } from "zod";

import type { Session, SessionSource } from "@/server/auth/session";
import {
  AppError,
  badRequest,
  rateLimited,
  statusForCode,
  toErrorBody,
  type ErrorCode,
} from "@/server/http/errors";
import { logger } from "@/server/logging";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * Route-handler wrapper: the ONE shape all API routes use so security
 * behaviour is uniform (SECURITY_RULES.md / ADR-0006/0008):
 *
 *   - optional JSON input validation (Zod; 400 with field names only),
 *   - session resolution through the injected `SessionSource`
 *     (authenticated server-side; a null session is just `null`, and each
 *     protected operation decides denial or not),
 *   - a route-level rate-limit hook (per identity when authorised, else per
 *     network key) feeding the limiter boundary,
 *   - uniform safe error mapping: `AppError` → status + safe body; anything
 *     unexpected → 500 internal_error with details logged (redacted)
 *     server-side only.
 *
 * Handlers stay pure: they receive `{ request, session, body }`.
 */

export interface RouteContext<TBody> {
  request: Request;
  /** Verified session or null — NEVER a client-supplied identity. */
  session: Session | null;
  /** Parsed+validated JSON body; `undefined` when the route takes no input. */
  body: TBody | undefined;
  /**
   * Dynamic route segments (`[id]`), already decoded by Next. Empty for static
   * routes. Values are still validated by the service before any data access.
   */
  params: Record<string, string>;
}

export interface RouteDeps<TBody> {
  /** Session source for this route. Tests inject labelled doubles. */
  sessionSource: SessionSource;
  /** Schema for the JSON body; omit for body-less routes. */
  inputSchema?: z.ZodType<TBody>;
  /**
   * Optional route-level limiter. When present, every request consumes one
   * token before the handler runs.
   */
  limiter?: RateLimiter;
  /** Handlers receive the context and return a `Response`. */
  handler: (ctx: RouteContext<TBody>) => Response | Promise<Response>;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

function identityKeyOf(session: Session | null, request: Request): string {
  if (session) {
    return `user:${session.userId}`;
  }
  // Coarse network fallback for unauthenticated abuse-limiting. Proxies may
  // vary this; it exists to bound anonymous load, not to identify users.
  const forwarded = request.headers.get("x-forwarded-for") ?? "unknown-peer";
  return `peer:${forwarded.split(",")[0]?.trim() || "unknown"}`;
}

function parseErrorBody(code: ErrorCode, message: string): string {
  return JSON.stringify(toErrorBody(new AppError(code, message)));
}

/** Build the wrapped route function for a Next.js App Router route module. */
export function createApiRoute<TBody>(
  deps: RouteDeps<TBody>,
): (
  request: Request,
  context?: { params?: Promise<Record<string, string>> },
) => Promise<Response> {
  return async function route(
    request: Request,
    context?: { params?: Promise<Record<string, string>> },
  ): Promise<Response> {
    try {
      const session = await deps.sessionSource.getSession(request);
      const params = (await context?.params) ?? {};

      if (deps.limiter) {
        const decision = deps.limiter.limit(identityKeyOf(session, request));
        if (!decision.allowed) {
          throw rateLimited();
        }
      }

      let body: TBody | undefined;
      if (deps.inputSchema) {
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          logger.warn("unsupported content type rejected", {
            path: new URL(request.url).pathname,
          });
          throw badRequest("Expected a JSON request body.");
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw badRequest("Request body is not valid JSON.");
        }
        const parsed = deps.inputSchema.safeParse(raw);
        if (!parsed.success) {
          const fields = [
            ...new Set(parsed.error.issues.map((i) => i.path.join("."))),
          ].filter(Boolean);
          logger.warn("input validation rejected", {
            path: new URL(request.url).pathname,
            fields: fields.length > 10 ? fields.slice(0, 10) : fields,
          });
          // Field NAMES are safe to return; values and messages stay out.
          throw badRequest(
            fields.length > 0
              ? `Invalid input in: ${fields.join(", ")}`
              : "Invalid request body.",
          );
        }
        body = parsed.data;
      }

      const response = await deps.handler({ request, session, body, params });
      return response;
    } catch (error) {
      if (error instanceof AppError) {
        if (error.code === "internal_error") {
          // Never expected; treat like unknown for logging, respond safe.
          logger.error("internal error", { error_message: error.safeMessage });
        }
        return new Response(JSON.stringify(toErrorBody(error)), {
          status: statusForCode(error.code),
          headers: JSON_HEADERS,
        });
      }
      // Unknown failure: log server-side (redacted), return the generic body.
      logger.error("unhandled route error", {
        error_name: error instanceof Error ? error.name : "NonError",
        error_message: error instanceof Error ? error.message : String(error),
      });
      return new Response(
        parseErrorBody(
          "internal_error",
          "Something went wrong. Please try again later.",
        ),
        {
          status: 500,
          headers: JSON_HEADERS,
        },
      );
    }
  };
}
