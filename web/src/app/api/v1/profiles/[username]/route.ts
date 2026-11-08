import "server-only";

import {
  createProfileReadLimiter,
  getProfileService,
} from "@/modules/profile/provider";
import {
  toOwnerProfileDto,
  toPublicProfileDto,
  type ProfileService,
} from "@/modules/profile/service";
import { notFound } from "@/server/http/errors";
import type { SessionSource } from "@/server/auth/session";
import { createApiRoute } from "@/server/http/handler";
import { getLazySessionSource } from "@/server/provider-access";
import type { RateLimiter } from "@/server/ratelimit";

/**
 * `GET /api/v1/profiles/[username]` — public profile read.
 *
 * - Anonymous visitors are allowed, but receive ONLY the public field allowlist
 *   (handle, display name, bio, avatar URL). The auth subject, internal profile
 *   id, timestamps and the visibility setting are owner-only data.
 * - A private profile answers `404` to everyone except its owner. A `403` would
 *   confirm the handle exists, which is the enumeration oracle this slice must
 *   not create.
 * - The App Router passes dynamic segments in a second handler argument, but the
 *   route wrapper's contract is `(request) => Response`; the handle is therefore
 *   read from the pathname, which is also what makes this testable without
 *   framework context.
 */

export interface PublicProfileRouteDeps {
  sessionSource: SessionSource;
  service: ProfileService;
  limiter?: RateLimiter;
}

function handleFromPathname(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function createPublicProfileRoute(deps: PublicProfileRouteDeps) {
  return createApiRoute({
    sessionSource: deps.sessionSource,
    limiter: deps.limiter,
    handler: async ({ request, session }) => {
      const view = await deps.service.findProfileForViewer(
        handleFromPathname(request),
        session,
      );
      if (!view) {
        throw notFound("Profile not found.");
      }
      return Response.json(
        {
          profile: view.isOwner
            ? toOwnerProfileDto(view.profile)
            : toPublicProfileDto(view.profile),
          isOwner: view.isOwner,
        },
        { headers: { "cache-control": "no-store" } },
      );
    },
  });
}

const moduleDeps: PublicProfileRouteDeps = {
  sessionSource: getLazySessionSource(),
  get service(): ProfileService {
    return getProfileService();
  },
  limiter: createProfileReadLimiter(),
};

export const GET = createPublicProfileRoute(moduleDeps);
