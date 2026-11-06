import "server-only";

import { z } from "zod";

import { createApiRoute } from "@/server/http/handler";
import {
  createOwnedResourceService,
  InMemoryOwnedItemRepository,
} from "@/modules/example-owned-resource/service";
import type { SessionSource } from "@/server/auth/session";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * Protected API reference implementation for the foundation.
 *
 * This route pair exists so the deny-by-default, session-verification and
 * cross-user-denial boundaries are exercised through ONE canonical shape
 * (see web/tests/auth-boundaries.test.ts). It must be deleted or replaced
 * with real modules when the identity/content slices land — never shipped as
 * user-facing functionality.
 */

export interface OwnedItemsRouteDeps {
  sessionSource: SessionSource;
  limiter?: RateLimiter;
}

const repository = new InMemoryOwnedItemRepository();
const service = createOwnedResourceService(repository);

const createItemSchema = z.object({
  title: z.string().min(1).max(120),
});

/** Deny-by-default: no valid session ⇒ 401 before anything else happens. */
export function createGetRoute(deps: OwnedItemsRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: ({ session }) => {
      const items = service.listOwnItems(session);
      return Response.json(
        { items },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

export function createPostRoute(deps: OwnedItemsRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    inputSchema: createItemSchema,
    handler: ({ session, body }) => {
      const item = service.createItem(session, { title: body!.title });
      return Response.json(
        { item },
        { status: 201, headers: { "cache-control": "no-store" } },
      );
    },
  });
}

/** Route module export: GET /api/v1/owned-items — wired at build time via the module's own deps. */
const moduleLevelDeps: OwnedItemsRouteDeps = {
  // The production source is deliberately unreachable in this task (no
  // provider project); importing it here would break uncredentialed builds,
  // so the module-level export is satisfied by the configured-source
  // resolver inside createSupabaseSessionSource when env vars exist.
  sessionSource: getModuleSessionSource(),
};

function getModuleSessionSource(): SessionSource {
  // Lazy: constructed on first route use, never at module import time.
  let cached: SessionSource | null = null;
  return {
    async getSession(request: Request) {
      if (cached) {
        return cached.getSession(request);
      }
      const { isSupabaseAuthConfigured, createSupabaseSessionSource } =
        await import("@/server/provider-access");
      if (!isSupabaseAuthConfigured()) {
        // Deny by default while identity is unconfigured.
        return null;
      }
      cached = createSupabaseSessionSource();
      return cached.getSession(request);
    },
  };
}

export const GET = createGetRoute(moduleLevelDeps);

export const POST = createPostRoute(moduleLevelDeps);
