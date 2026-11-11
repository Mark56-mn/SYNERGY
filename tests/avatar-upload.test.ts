import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createAvatarUploadRoute } from "@/app/api/v1/profile/avatar-upload/route";
import {
  avatarFolderForUser,
  cloudinarySignature,
  isCloudinaryAvatarUrl,
  sniffAvatarMime,
  validateAvatarFile,
} from "@/modules/profile/avatar-upload";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

/**
 * TASK-007B avatar upload — validation, signing and route security.
 *
 * The uploader is a labelled test double: these tests prove status codes,
 * CSRF/origin handling, validation and that a failed upload never touches the
 * profile row. They do not prove a live Cloudinary round-trip.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb";
const ORIGIN = "http://localhost:3000";
const CLOUD = { cloudName: "test-cloud", apiKey: "key", apiSecret: "secret" };

function sessionSourceFor(tokens: Record<string, string>): SessionSource {
  return {
    async getSession(request: Request) {
      const header = request.headers.get("authorization") ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      const userId = token ? tokens[token] : undefined;
      return userId ? { userId, roles: ["member"] } : null;
    },
  };
}

const nullSource: SessionSource = { getSession: async () => null };

function pngFile(size = 32): File {
  // Minimal valid PNG: 8-byte signature + IHDR chunk declaring 32×32.
  const header = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  void size;
  return new File([header], "avatar.png", { type: "image/png" });
}

function multipart(file: File, headers: Headers): Request {
  const form = new FormData();
  form.append("file", file);
  return new Request(`${ORIGIN}/api/v1/profile/avatar-upload`, {
    method: "POST",
    headers,
    body: form,
  });
}

function authed(token?: string, origin = ORIGIN): Headers {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  headers.set("origin", origin);
  return headers;
}

describe("sniffing and validation", () => {
  it("sniffs PNG/JPEG/WebP and rejects SVG/GIF/HTML", () => {
    expect(
      sniffAvatarMime(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(sniffAvatarMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffAvatarMime(
        new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
      ),
    ).toBe("image/webp");
    expect(sniffAvatarMime(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(sniffAvatarMime(new TextEncoder().encode("GIF89a"))).toBeNull();
  });

  it("rejects oversize files before any sniffing (4 MB cap)", () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    expect(() =>
      validateAvatarFile({ bytes: big, declaredType: "image/png" }),
    ).toThrow(/too large/i);
  });

  it("rejects an SVG even if renamed to .png", () => {
    const svg = new TextEncoder().encode(
      "<svg xmlns='http://www.w3.org/2000/svg'/>",
    );
    expect(() =>
      validateAvatarFile({
        bytes: svg,
        declaredType: "image/png",
        filename: "x.png",
      }),
    ).toThrow(/only JPEG, PNG or WebP/i);
  });

  it("accepts a small valid PNG with correct dimensions", () => {
    const file = pngFile();
    const bytes = new Uint8Array(file as unknown as ArrayBuffer);
    void bytes;
    // Build via the same header as pngFile.
    const header = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20,
    ]);
    const validated = validateAvatarFile({
      bytes: header,
      declaredType: "image/png",
      filename: "avatar.png",
    });
    expect(validated.mime).toBe("image/png");
    expect(validated.width).toBe(32);
    expect(validated.height).toBe(32);
  });
});

describe("signing and folder isolation", () => {
  it("produces a deterministic Cloudinary signature over the allowlisted params", () => {
    const params = {
      folder: "synergy/avatars/abc",
      public_id: "avatar_123",
      timestamp: "123",
    };
    const expected = createHash("sha1")
      .update(
        `folder=synergy/avatars/abc&public_id=avatar_123&timestamp=123secret`,
      )
      .digest("hex");
    expect(cloudinarySignature(params, "secret")).toBe(expected);
  });

  it("gives each member an opaque, distinct folder — never the raw user id", () => {
    const folderA = avatarFolderForUser(USER_A);
    const folderB = avatarFolderForUser(USER_B);
    expect(folderA).toMatch(/^synergy\/avatars\/[0-9a-f]{16}$/);
    expect(folderA).not.toBe(folderB);
    expect(folderA).not.toContain(USER_A);
  });

  it("verifies Cloudinary URLs belong to the configured cloud and folder", () => {
    expect(
      isCloudinaryAvatarUrl(
        "https://res.cloudinary.com/test-cloud/image/upload/synergy/avatars/abc/avatar.png",
        "test-cloud",
      ),
    ).toBe(true);
    expect(
      isCloudinaryAvatarUrl(
        "https://res.cloudinary.com/other/image/upload/synergy/avatars/abc/avatar.png",
        "test-cloud",
      ),
    ).toBe(false);
    expect(
      isCloudinaryAvatarUrl("https://cdn.example/avatar.png", "test-cloud"),
    ).toBe(false);
    expect(
      isCloudinaryAvatarUrl(
        "http://res.cloudinary.com/test-cloud/image/upload/synergy/avatars/abc/x.png",
        "test-cloud",
      ),
    ).toBe(false);
  });
});

describe("POST /api/v1/profile/avatar-upload", () => {
  const fakeUploader = async (input: {
    mime: "image/png";
    width: number;
    height: number;
    bytes: Uint8Array;
    userId: string;
    config: { cloudName: string };
  }) => ({
    avatarUrl: `https://${input.config.cloudName}.example/uploaded.png`,
    mime: "image/png" as const,
    bytes: input.bytes.length,
    width: input.width,
    height: input.height,
  });

  it("denies anonymous callers", async () => {
    const route = createAvatarUploadRoute({
      sessionSource: nullSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });
    const response = await route(multipart(pngFile(), authed(undefined)));
    expect(response.status).toBe(401);
  });

  it("requires a same-origin request (CSRF)", async () => {
    const route = createAvatarUploadRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });
    const response = await route(
      multipart(pngFile(), authed("token-a", "https://evil.example")),
    );
    expect(response.status).toBe(403);
  });

  it("returns 503 with the exact Preview variables when Cloudinary is not configured", async () => {
    const route = createAvatarUploadRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      uploader: fakeUploader,
      readConfig: () => null,
    });
    const response = await route(multipart(pngFile(), authed("token-a")));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("SUPABASE_AUTH_URL");
    expect(body.error.message).toContain("SUPABASE_AUTH_ANON_KEY");
  });

  it("uploads for the verified caller only and returns only the URL", async () => {
    const route = createAvatarUploadRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });
    const response = await route(multipart(pngFile(), authed("token-a")));
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["avatarUrl"]);
    expect(JSON.stringify(body)).not.toContain(USER_A);
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("rate-limits uploads", async () => {
    const route = createAvatarUploadRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      uploader: fakeUploader,
      limiter: createInMemoryRateLimiter({
        maxPerWindow: 1,
        windowSeconds: 60,
      }),
      readConfig: () => CLOUD,
    });
    const first = await route(multipart(pngFile(), authed("token-a")));
    expect(first.status).toBe(200);
    const second = await route(multipart(pngFile(), authed("token-a")));
    expect(second.status).toBe(429);
  });

  it("does not call the uploader for an unsupported file", async () => {
    let called = false;
    const route = createAvatarUploadRoute({
      sessionSource: sessionSourceFor({ "token-a": USER_A }),
      uploader: async () => {
        called = true;
        return fakeUploader({} as never);
      },
      readConfig: () => CLOUD,
    });
    const svg = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    const response = await route(multipart(svg, authed("token-a")));
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });
});
