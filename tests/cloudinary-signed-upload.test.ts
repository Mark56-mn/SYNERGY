import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLOUDINARY_UNSIGNED_UPLOAD_FIELDS,
  buildCloudinaryUploadPlan,
  cloudinarySignature,
  uploadImageToCloudinary,
  type CloudinaryConfig,
  type ValidatedImageFile,
} from "@/server/media/image-upload";

/**
 * TASK-008H — Cloudinary signed-upload correction.
 *
 * The deployed Preview rejected photo uploads with HTTP 401 because the
 * signature did not match the submitted fields: `resource_type` was signed but
 * is excluded by Cloudinary, while `overwrite=false` and
 * `unique_filename=true` were submitted without being signed.
 *
 * These tests pin the exact signing input and the exact multipart fields. They
 * use deterministic doubles and prove the request we build, not that a live
 * Cloudinary environment accepts it.
 */

const FOLDER = "synergy/posts/0123456789abcdef";
const PUBLIC_ID = "post_0123456789ab";
const TIMESTAMP = "1700000000";
const CONFIG: CloudinaryConfig = {
  cloudName: "test-cloud",
  apiKey: "test-key",
  apiSecret: "test-secret",
};

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
}

const validated: ValidatedImageFile = {
  bytes: pngBytes(),
  mime: "image/png",
  width: 32,
  height: 32,
  declaredType: "image/png",
  filename: "photo.png",
};

function plan(overrides: Partial<typeof CONFIG> = {}) {
  return buildCloudinaryUploadPlan({
    folder: FOLDER,
    publicId: PUBLIC_ID,
    timestamp: TIMESTAMP,
    config: { ...CONFIG, ...overrides },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cloudinary signature parameter set", () => {
  it("signs exactly folder, overwrite, public_id and timestamp", () => {
    const { signedParams } = plan();
    expect(Object.keys(signedParams).sort()).toEqual([
      "folder",
      "overwrite",
      "public_id",
      "timestamp",
    ]);
    expect(signedParams.overwrite).toBe("false");
  });

  it("never signs resource_type, which Cloudinary excludes", () => {
    const { signedParams } = plan();
    expect(signedParams).not.toHaveProperty("resource_type");
    expect(CLOUDINARY_UNSIGNED_UPLOAD_FIELDS).toContain("resource_type");
    for (const excluded of CLOUDINARY_UNSIGNED_UPLOAD_FIELDS) {
      expect(signedParams).not.toHaveProperty(excluded);
    }
  });

  it("computes SHA-1 over the alphabetically sorted string plus the secret", () => {
    const { signature } = plan();
    const expected = createHash("sha1")
      .update(
        `folder=${FOLDER}&overwrite=false&public_id=${PUBLIC_ID}&timestamp=${TIMESTAMP}test-secret`,
      )
      .digest("hex");
    expect(signature).toBe(expected);
    expect(signature).toMatch(/^[0-9a-f]{40}$/);
  });

  it("changes when any signed parameter changes", () => {
    const base = plan().signature;
    const otherFolder = buildCloudinaryUploadPlan({
      folder: "synergy/posts/fedcba9876543210",
      publicId: PUBLIC_ID,
      timestamp: TIMESTAMP,
      config: CONFIG,
    }).signature;
    const otherPublicId = buildCloudinaryUploadPlan({
      folder: FOLDER,
      publicId: "post_ba9876543210",
      timestamp: TIMESTAMP,
      config: CONFIG,
    }).signature;
    const otherTimestamp = buildCloudinaryUploadPlan({
      folder: FOLDER,
      publicId: PUBLIC_ID,
      timestamp: "1700000001",
      config: CONFIG,
    }).signature;
    const otherOverwrite = cloudinarySignature(
      { ...plan().signedParams, overwrite: "true" },
      CONFIG.apiSecret,
    );

    for (const signature of [
      otherFolder,
      otherPublicId,
      otherTimestamp,
      otherOverwrite,
    ]) {
      expect(signature).not.toBe(base);
    }
  });
});

describe("Cloudinary multipart fields", () => {
  it("sends the signed parameters plus api_key and signature, nothing else", () => {
    const { signedParams, fields, signature } = plan();
    expect(Object.keys(fields).sort()).toEqual([
      "api_key",
      "folder",
      "overwrite",
      "public_id",
      "signature",
      "timestamp",
    ]);
    expect(fields).toMatchObject(signedParams);
    expect(fields.signature).toBe(signature);
    expect(fields.api_key).toBe(CONFIG.apiKey);
  });

  it("sends resource_type and unique_filename in neither signature nor body", () => {
    const { signedParams, fields } = plan();
    expect(fields).not.toHaveProperty("resource_type");
    expect(fields).not.toHaveProperty("unique_filename");
    expect(fields).not.toHaveProperty("cloud_name");
    expect(signedParams).not.toHaveProperty("unique_filename");
  });

  it("keeps the resource type in the upload URL path", () => {
    expect(plan().url).toBe(
      "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
    );
    expect(plan().url).not.toContain("auto/upload");
  });
});

describe("uploadImageToCloudinary request", () => {
  it("posts exactly the planned fields and returns the verified URL", async () => {
    const secureUrl = `https://res.cloudinary.com/${CONFIG.cloudName}/image/upload/${FOLDER}/${PUBLIC_ID}.png`;
    let capturedUrl = "";
    let capturedForm: FormData | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedForm = init.body as FormData;
        return new Response(JSON.stringify({ secure_url: secureUrl }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const result = await uploadImageToCloudinary({
      validated,
      folder: FOLDER,
      publicIdPrefix: "post",
      config: CONFIG,
    });

    expect(result.secureUrl).toBe(secureUrl);
    expect(capturedUrl).toBe(
      "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
    );

    const form = capturedForm as unknown as FormData;
    const names = [...form.keys()].sort();
    expect(names).toEqual([
      "api_key",
      "file",
      "folder",
      "overwrite",
      "public_id",
      "signature",
      "timestamp",
    ]);
    expect(form.get("resource_type")).toBeNull();
    expect(form.get("unique_filename")).toBeNull();
    expect(form.get("overwrite")).toBe("false");
    expect(form.get("folder")).toBe(FOLDER);
    expect(form.get("public_id")).toBe(result.publicId);
    expect(form.get("timestamp")).toMatch(/^\d{10}$/);

    // The submitted signature must be exactly the signature of the submitted
    // signed fields — the invariant Cloudinary validates.
    const signed = Object.fromEntries(
      names
        .filter(
          (name) =>
            name !== "api_key" && name !== "signature" && name !== "file",
        )
        .map((name) => [name, form.get(name) as string]),
    );
    expect(form.get("signature")).toBe(
      cloudinarySignature(signed, CONFIG.apiSecret),
    );
  });

  it("still classifies a rejected upload as a provider failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unauthorized", { status: 401 })),
    );

    await expect(
      uploadImageToCloudinary({
        validated,
        folder: FOLDER,
        publicIdPrefix: "post",
        config: CONFIG,
      }),
    ).rejects.toMatchObject({
      name: "MediaProviderFailure",
      code: "internal_error",
      reason: "provider_status",
      providerStatus: 401,
    });
  });

  it("still rejects a returned URL outside the configured cloud and folder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ secure_url: "https://evil.example/x.png" }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      ),
    );

    await expect(
      uploadImageToCloudinary({
        validated,
        folder: FOLDER,
        publicIdPrefix: "post",
        config: CONFIG,
      }),
    ).rejects.toMatchObject({
      name: "MediaProviderFailure",
      reason: "invalid_url",
    });
  });
});
