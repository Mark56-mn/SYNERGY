import { afterEach, describe, expect, it, vi } from "vitest";

import { createPostMediaUploadRoute } from "@/app/api/v1/posts/media-upload/route";
import type { SessionSource } from "@/server/auth/session";
import {
  MediaProviderFailure,
  uploadImageToCloudinary,
  type ValidatedImageFile,
} from "@/server/media/image-upload";

/**
 * TASK-008G post-photo upload diagnostics.
 *
 * These tests prove the stage model, the failure classification and the
 * privacy allow-list. The Cloudinary call is a labelled double in the route
 * tests; `uploadImageToCloudinary` is exercised directly with a stubbed
 * `fetch` so each provider failure class is deterministic. No live network
 * call is ever made.
 */

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGIN = "http://localhost:3000";
const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sentinel secrets/PII: none of these may ever appear in captured output.
const SENTINEL_CLOUD = "sentinelcloudname";
const SENTINEL_KEY = "sentinel-api-key-value";
const SENTINEL_SECRET = "sentinel-api-secret-value";
const SENTINEL_FILENAME = "private-holiday-photo-sentinel.png";
const CLOUD = {
  cloudName: SENTINEL_CLOUD,
  apiKey: SENTINEL_KEY,
  apiSecret: SENTINEL_SECRET,
};

const sessionSource: SessionSource = {
  async getSession(request) {
    const header = request.headers.get("authorization") ?? "";
    return header === "Bearer token-a"
      ? { userId: USER_A, roles: ["member"] }
      : null;
  },
};

const nullSource: SessionSource = { getSession: async () => null };

type LogLine = Record<string, unknown>;

let captured: string[] = [];

function captureLogs() {
  captured = [];
  for (const level of ["log", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((value: unknown) => {
      captured.push(String(value));
    });
  }
}

function events(): LogLine[] {
  return captured
    .map((line) => {
      try {
        return JSON.parse(line) as LogLine;
      } catch {
        return null;
      }
    })
    .filter((line): line is LogLine => line !== null)
    .filter((line) => line.message === "post_media_upload");
}

function stages(): unknown[] {
  return events().map((line) => line.stage);
}

function allOutput(): string {
  return captured.join("\n");
}

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
}

function pngFile(filename = SENTINEL_FILENAME): File {
  return new File([pngBytes()], filename, { type: "image/png" });
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
  mediaUrl: `https://res.cloudinary.com/${SENTINEL_CLOUD}/image/upload/synergy/posts/abc/photo.png`,
});

function errorMessage(body: unknown): string {
  return (body as { error: { message: string } }).error.message;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("post media upload diagnostics", () => {
  it("logs one correlated stage per transition on success and leaks nothing", async () => {
    captureLogs();
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });

    const response = await route(request(pngFile(), "token-a"));

    expect(response.status).toBe(200);
    const requestId = response.headers.get("x-upload-request-id");
    expect(requestId).toMatch(REQUEST_ID);
    expect(stages()).toEqual([
      "received",
      "authorized",
      "config_present",
      "validation_passed",
      "provider_started",
      "provider_succeeded",
      "completed",
    ]);
    for (const line of events()) {
      expect(line.request_id).toBe(requestId);
    }

    const output = allOutput();
    for (const secret of [
      SENTINEL_CLOUD,
      SENTINEL_KEY,
      SENTINEL_SECRET,
      SENTINEL_FILENAME,
      "photo.png",
      USER_A,
      "https://",
      "res.cloudinary.com",
      "token-a",
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it("classifies a denied session and returns the correlation id", async () => {
    captureLogs();
    const route = createPostMediaUploadRoute({
      sessionSource: nullSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });

    const response = await route(request(pngFile()));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-upload-request-id")).toMatch(REQUEST_ID);
    expect(stages()).toEqual(["received", "auth_denied"]);
    expect(events()[1]?.http_status).toBe(401);
  });

  it("classifies a rejected cross-origin request", async () => {
    captureLogs();
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => CLOUD,
    });

    const response = await route(
      request(pngFile(), "token-a", "https://evil.example"),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("x-upload-request-id")).toMatch(REQUEST_ID);
    expect(stages()).toEqual(["received", "origin_rejected"]);
  });

  it("records missing configuration without changing the 503 contract", async () => {
    captureLogs();
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: fakeUploader,
      readConfig: () => null,
    });

    const response = await route(request(pngFile(), "token-a"));

    expect(response.status).toBe(503);
    expect(response.headers.get("x-upload-request-id")).toMatch(REQUEST_ID);
    const body = await response.json();
    expect(errorMessage(body)).toContain("CLOUDINARY_CLOUD_NAME");
    expect(errorMessage(body)).toContain("text-only");
    expect(stages()).toEqual(["received", "authorized", "config_missing"]);
    expect(events()[2]?.config_present).toBe(false);
    expect(allOutput()).not.toContain(SENTINEL_FILENAME);
  });

  it("classifies a validation failure and never reaches the provider", async () => {
    captureLogs();
    let uploaderCalled = false;
    const route = createPostMediaUploadRoute({
      sessionSource,
      uploader: async () => {
        uploaderCalled = true;
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
    expect(response.headers.get("x-upload-request-id")).toMatch(REQUEST_ID);
    expect(uploaderCalled).toBe(false);
    expect(stages()).toEqual([
      "received",
      "authorized",
      "config_present",
      "validation_failed",
    ]);
    expect(allOutput()).not.toContain("x.png");
  });

  it("classifies provider network and provider-status failures", async () => {
    for (const [failure, expected] of [
      [new MediaProviderFailure("network"), { provider_reason: "network" }],
      [
        new MediaProviderFailure("provider_status", 401),
        { provider_reason: "provider_status", provider_status: 401 },
      ],
    ] as const) {
      captureLogs();
      const route = createPostMediaUploadRoute({
        sessionSource,
        uploader: async () => {
          throw failure;
        },
        readConfig: () => CLOUD,
      });

      const response = await route(request(pngFile(), "token-a"));

      expect(response.status).toBe(500);
      expect(response.headers.get("x-upload-request-id")).toMatch(REQUEST_ID);
      // The user-facing message and status are unchanged.
      expect(errorMessage(await response.json())).toBe(
        "Something went wrong. Please try again later.",
      );
      const failed = events().find((line) => line.stage === "provider_failed");
      expect(failed).toMatchObject(expected);
      expect(stages()).not.toContain("completed");
      expect(allOutput()).not.toContain(SENTINEL_SECRET);
      vi.restoreAllMocks();
    }
  });
});

describe("Cloudinary failure classification", () => {
  const validated: ValidatedImageFile = {
    bytes: pngBytes(),
    mime: "image/png",
    width: 32,
    height: 32,
    declaredType: "image/png",
    filename: SENTINEL_FILENAME,
  };
  const input = {
    validated,
    folder: `synergy/posts/${"a".repeat(16)}`,
    publicIdPrefix: "post",
    config: CLOUD,
  };

  async function reasonOf(): Promise<string> {
    try {
      await uploadImageToCloudinary(input);
    } catch (error) {
      expect(error).toBeInstanceOf(MediaProviderFailure);
      const failure = error as MediaProviderFailure;
      expect(failure.code).toBe("internal_error");
      expect(failure.safeMessage).toBe(
        "Something went wrong. Please try again later.",
      );
      expect(failure.message).not.toContain(SENTINEL_SECRET);
      return failure.reason;
    }
    throw new Error("expected the upload to fail");
  }

  it("distinguishes a rejected fetch from a platform timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect(await reasonOf()).toBe("network");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
      }),
    );
    expect(await reasonOf()).toBe("timeout");
  });

  it("records a non-2xx provider status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 502 })),
    );
    expect(await reasonOf()).toBe("provider_status");
  });

  it("distinguishes a malformed provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>gateway</html>", { status: 200 })),
    );
    expect(await reasonOf()).toBe("malformed_response");
  });

  it("rejects a returned URL that is not in our cloud and folder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ secure_url: "https://evil.example/photo.png" }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    expect(await reasonOf()).toBe("invalid_url");
  });

  it("still returns the verified URL on success", async () => {
    const secureUrl = `https://res.cloudinary.com/${SENTINEL_CLOUD}/image/upload/${input.folder}/post.png`;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ secure_url: secureUrl }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    await expect(uploadImageToCloudinary(input)).resolves.toMatchObject({
      secureUrl,
    });
  });
});
