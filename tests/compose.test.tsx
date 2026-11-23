/** @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PostStudio } from "@/components/compose/PostStudio";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/compose",
}));

const DRAFT_KEY = "synergy.compose.draft.v1";

/**
 * jsdom in this environment exposes `window` without a Storage instance, so a
 * deterministic in-memory implementation stands in. It is test scaffolding
 * only; the component still treats storage as optional and catches failures.
 */
function ensureLocalStorage() {
  if (window.localStorage) return;
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

beforeEach(() => {
  pushMock.mockReset();
  ensureLocalStorage();
  window.localStorage.clear();
  // jsdom does not implement object URLs.
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderStudio() {
  return render(<PostStudio username="ada_okoro" displayName="Ada Okoro" />);
}

describe("PostStudio", () => {
  it("cannot publish an empty caption", () => {
    renderStudio();
    const button = screen.getByRole("button", { name: "Publish post" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the topic preview and character budget", async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.type(
      screen.getByLabelText("Post caption"),
      "New work today #tailoring",
    );
    expect(screen.getByText("Topics: #tailoring")).toBeTruthy();
    expect(screen.getByText(/\d+ characters left/)).toBeTruthy();
  });

  it("publishes a text post and redirects to the member's profile", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ post: { id: "post-1" } }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderStudio();

    await user.type(screen.getByLabelText("Post caption"), "Hello #makers");
    await user.click(screen.getByRole("button", { name: "Publish post" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/u/ada_okoro"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/v1/posts");
    expect(JSON.parse(init.body)).toEqual({ body: "Hello #makers" });
  });

  it("keeps the caption and reports a failed publish", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { message: "Not published." } }),
            { status: 500, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    renderStudio();

    await user.type(screen.getByLabelText("Post caption"), "Keep me");
    await user.click(screen.getByRole("button", { name: "Publish post" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Not published.");
    expect(
      (screen.getByLabelText("Post caption") as HTMLTextAreaElement).value,
    ).toBe("Keep me");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not publish the post when the photo upload is unconfigured", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message:
                "Post photos are not configured yet. The owner must set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and MEDIA_PROVIDER_ADAPTER=cloudinary in the Preview environment. You can still publish a text-only post.",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderStudio();

    await user.type(screen.getByLabelText("Post caption"), "Photo post");
    const file = new File(["png-bytes"], "photo.png", { type: "image/png" });
    await user.upload(
      screen.getByLabelText("Choose a photo from your gallery or files"),
      file,
    );
    await user.click(screen.getByRole("button", { name: "Publish post" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "CLOUDINARY_CLOUD_NAME",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/posts/media-upload");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("logs a rejected upload fetch without leaking file or caption detail", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("Failed to fetch");
        }),
      );
      renderStudio();

      await user.type(screen.getByLabelText("Post caption"), "Private caption");
      await user.upload(
        screen.getByLabelText("Choose a photo from your gallery or files"),
        new File(["png-bytes"], "private-sentinel-name.png", {
          type: "image/png",
        }),
      );
      await user.click(screen.getByRole("button", { name: "Publish post" }));

      expect(await screen.findByRole("alert")).toBeTruthy();
      expect(screen.getByRole("alert").textContent).toContain(
        "Network problem — your post was not published.",
      );
      const logged = warn.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain("fetch_rejected");
      expect(logged).not.toContain("private-sentinel-name.png");
      expect(logged).not.toContain("Private caption");
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("logs an HTTP upload failure with the server correlation id", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const requestId = "3f0d1c2b-4a5e-4f60-8b71-9c2d3e4f5a6b";
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({ error: { message: "Upload rejected." } }),
              {
                status: 400,
                headers: {
                  "content-type": "application/json",
                  "x-upload-request-id": requestId,
                },
              },
            ),
        ),
      );
      renderStudio();

      await user.type(screen.getByLabelText("Post caption"), "Photo post");
      await user.upload(
        screen.getByLabelText("Choose a photo from your gallery or files"),
        new File(["png-bytes"], "photo.png", { type: "image/png" }),
      );
      await user.click(screen.getByRole("button", { name: "Publish post" }));

      expect((await screen.findByRole("alert")).textContent).toContain(
        "Upload rejected.",
      );
      const logged = warn.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain("http_error");
      expect(logged).toContain(requestId);
      expect(logged).toContain("400");
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("logs a success response that is not JSON", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () => new Response("<html>gateway</html>", { status: 200 }),
        ),
      );
      renderStudio();

      await user.type(screen.getByLabelText("Post caption"), "Photo post");
      await user.upload(
        screen.getByLabelText("Choose a photo from your gallery or files"),
        new File(["png-bytes"], "photo.png", { type: "image/png" }),
      );
      await user.click(screen.getByRole("button", { name: "Publish post" }));

      expect((await screen.findByRole("alert")).textContent).toContain(
        "Network problem — your post was not published.",
      );
      const logged = warn.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain("parse_failed");
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("logs a success payload without a usable media URL", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(JSON.stringify({ mediaUrl: "" }), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
        ),
      );
      renderStudio();

      await user.type(screen.getByLabelText("Post caption"), "Photo post");
      await user.upload(
        screen.getByLabelText("Choose a photo from your gallery or files"),
        new File(["png-bytes"], "photo.png", { type: "image/png" }),
      );
      await user.click(screen.getByRole("button", { name: "Publish post" }));

      expect((await screen.findByRole("alert")).textContent).toContain(
        "The server did not confirm the upload.",
      );
      const logged = warn.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain("missing_media_url");
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("logs a confirmed upload and then publishes the photo post", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              mediaUrl:
                "https://res.cloudinary.com/test-cloud/image/upload/synergy/posts/abc/photo.png",
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                "x-upload-request-id": "3f0d1c2b-4a5e-4f60-8b71-9c2d3e4f5a6b",
              },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ post: { id: "post-1" } }), {
            status: 201,
            headers: { "content-type": "application/json" },
          }),
        );
      vi.stubGlobal("fetch", fetchMock);
      renderStudio();

      await user.type(screen.getByLabelText("Post caption"), "Photo post");
      await user.upload(
        screen.getByLabelText("Choose a photo from your gallery or files"),
        new File(["png-bytes"], "photo.png", { type: "image/png" }),
      );
      await user.click(screen.getByRole("button", { name: "Publish post" }));

      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith("/u/ada_okoro"),
      );
      const logged = warn.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain("succeeded");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it("restores a text draft saved on this device", () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        body: "An earlier draft",
        mediaAlt: "",
        savedAt: new Date().toISOString(),
      }),
    );
    renderStudio();
    expect(
      (screen.getByLabelText("Post caption") as HTMLTextAreaElement).value,
    ).toBe("An earlier draft");
    expect(screen.getByText(/Draft restored from this device/)).toBeTruthy();
  });
});
