import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger, redact } from "@/server/logging";

describe("log redaction (SECURITY_RULES.md)", () => {
  it("secrets, tokens and credential-shaped keys are redacted to [redacted]", () => {
    const out = redact({
      password: "hunter2",
      api_key: "placeholder-api-key-value",
      authorization: "Bearer abc.def.ghi",
      session_token: "tok_live_whatever",
      cloudinary_api_secret: "itsasecret",
      cookie: "session=something",
      otp_code: "1234",
    }) as Record<string, string>;
    for (const key of Object.keys(out)) {
      expect(out[key]).toBe("[redacted]");
    }
  });

  it("PII-shaped keys are redacted; structural identifiers are preserved", () => {
    const out = redact({
      user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      item_id: "item_1",
      email: "somebody@example.com",
      phone: "+2348012345678",
      level: "info",
    }) as Record<string, string>;
    expect(out.user_id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(out.item_id).toBe("item_1");
    expect(out.level).toBe("info");
    expect(out.email).toBe("[redacted]");
    expect(out.phone).toBe("[redacted]");
  });

  it("nested payloads are redacted recursively", () => {
    const out = redact({
      request: {
        headers: { authorization: "Bearer topsecret" },
        body: { password: "pw123456", title: "safe title" },
      },
    });
    const request = (
      out as {
        request: {
          headers: Record<string, string>;
          body: Record<string, string>;
        };
      }
    ).request;
    expect(request.headers.authorization).toBe("[redacted]");
    expect(request.body.password).toBe("[redacted]");
    expect(request.body.title).toBe("safe title");
  });

  it("emitted error lines are single JSON objects with redacted payload", () => {
    const errors: string[] = [];
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((arg: unknown) => {
        errors.push(String(arg));
      });
    try {
      const testLogger = createLogger({ minLevel: "debug" });
      testLogger.error("failed login attempt", {
        email: "victim@example.com",
        password: "pw",
        user_id: "u_42",
      });
      expect(errors).toHaveLength(1);
      const parsed = JSON.parse(errors[0]!) as Record<string, unknown>;
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("failed login attempt");
      expect(parsed.email).toBe("[redacted]");
      expect(parsed.password).toBe("[redacted]");
      expect(parsed.user_id).toBe("u_42");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("debug output is suppressed below the configured minimum level", () => {
    const logs: string[] = [];
    const logSpy = vi
      .spyOn(console, "log")
      .mockImplementation((arg: unknown) => {
        logs.push(String(arg));
      });
    try {
      const testLogger = createLogger({ minLevel: "info" });
      testLogger.debug("noisy detail", { password: "irrelevant" });
      expect(logs).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Keep Vitest's own per-file console hooks intact for the suite.
beforeEach(() => {
  vi.restoreAllMocks();
});
