import { describe, expect, it } from "vitest";

import { createPostMediaUploadRoute } from "@/app/api/v1/posts/media-upload/route";
import type { SessionSource } from "@/server/auth/session";
import { createInMemoryRateLimiter } from "@/server/ratelimit";

/**
 * TASK-008B post-photo upload surface. The Cloudinary call is a labelled test
 * double: these tests prove auth, CSRF, validation, the 503 configuration
 * contract and the response shape. They do not prove a live Cloudinary upload.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGIN = "http://localhost:3000";
const CLOUD = { cloudName: "test-cloud", apiKey: "key", apiSecret: "secret" };

const sessionSource: SessionSource = {
  async getSession(request) {
    const header = request.headers.get("authorization") ?? "";
    return header === "Bearer token-a"
      ? { userId: USER_A, roles: ["member"] }
      : null;
  },
};

const nullSource: SessionSource = { getSession: async () => null };

function pngFile(): File {
  const header = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return new File([header], "photo.png", { type: "image/png" });
}

function request(file: File, token?: string, origin = ORIGIN): Request {
  const form = new FormData();
  form.append("file", file);
  const headers = new Headers({ origin });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`${ORIGIN}/api/v1/posts/media-upload`, {
    method: "POST",
    headers,
    body: form,
  });
}

const fakeUploader = async () => ({
  mediaUrl:
    "https://res.cloudinary.com/test-cloud/image/upload/synergy/posts/abc/photo.png",
});

describe("POST /api/v1/posts/media-upload", () => {
  it("denies anonymous callers", async () => {
    const route = createPostMediaUploadRoute({
      sessionSource: nullSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });
    expect((await route(request(pngFile()))).status).toBe(401);
  });

  it("requires a same-origin request (CSRF)", async () => {
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });
    const response = await route(
      request(pngFile(), "token-a", "https://evil.example"),
    );
    expect(response.status).toBe(403);
  });

  it("answers 503 naming the configuration when Cloudinary is absent", async () => {
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => null,
    });
    const response = await route(request(pngFile(), "token-a"));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("CLOUDINARY_CLOUD_NAME");
    expect(body.error.message).toContain("MEDIA_PROVIDER_ADAPTER");
    expect(body.error.message).toMatch(/text-only/i);
  });

  it("rejects an SVG disguised as an image without calling the uploader", async () => {
    let called = false;
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: async () => {
        called = true;
        return fakeUploader();
      },
      readConfig: () => CLOUD,
    });
    const svg = new File(
      ["<svg xmlns='http://www.w3.org/2000/svg'/>"],
      "x.png",
      {
        type: "image/png",
      },
    );
    const response = await route(request(svg, "token-a"));
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("returns only the verified media URL", async () => {
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });
    const response = await route(request(pngFile(), "token-a"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["mediaUrl"]);
    expect(JSON.stringify(body)).not.toContain(USER_A);
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("rate-limits uploads", async () => {
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
      limiter: createInMemoryRateLimiter({
        maxPerWindow: 1,
        windowSeconds: 60,
      }),
    });
    expect((await route(request(pngFile(), "token-a"))).status).toBe(200);
    expect((await route(request(pngFile(), "token-a"))).status).toBe(429);
  });
});
