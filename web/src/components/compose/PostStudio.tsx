"use client";

import {
  POST_BODY_MAX_LENGTH,
  POST_MEDIA_ALT_MAX_LENGTH,
  POST_MEDIA_MAX_BYTES,
  extractTopics,
} from "@synergy/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const DRAFT_KEY = "synergy.compose.draft.v1";
const ACCEPTED = "image/jpeg,image/png,image/webp";

type PublishState = "idle" | "publishing" | "published";

interface Draft {
  body: string;
  mediaAlt: string;
  savedAt: string;
}

/**
 * Post creation studio (TASK-008B).
 *
 * Phone-first flow: caption → optional gallery photo → preview → publish.
 *
 * Honesty rules:
 * - Nothing is written until the server confirms; the button is disabled while
 *   a request is in flight and the published state is shown only after a 201.
 * - A failed photo upload keeps the caption and the chosen file, and says why.
 *   If Cloudinary is not configured the 503 message explains that a text-only
 *   post is still possible — it never silently drops the photo.
 * - The caption and alt text are saved to this browser as a draft, and the UI
 *   says so; files are never persisted locally.
 */
export function PostStudio({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [state, setState] = useState<PublishState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  const topics = extractTopics(body);
  const remaining = POST_BODY_MAX_LENGTH - body.length;
  const publishing = state === "publishing";
  const canPublish = state === "idle" && body.trim().length > 0;

  // Restore a text draft saved by a previous visit on this device.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<Draft>;
      if (typeof draft.body === "string" && draft.body.trim().length > 0) {
        setBody(draft.body.slice(0, POST_BODY_MAX_LENGTH));
        setMediaAlt(
          typeof draft.mediaAlt === "string"
            ? draft.mediaAlt.slice(0, POST_MEDIA_ALT_MAX_LENGTH)
            : "",
        );
        setDraftNotice("Draft restored from this device.");
      }
    } catch {
      // A corrupt draft is ignored; it never blocks composing.
    }
  }, []);

  // Persist text only (never the file) while the member types.
  useEffect(() => {
    if (state === "published") return;
    const timer = setTimeout(() => {
      try {
        if (body.trim().length === 0 && mediaAlt.trim().length === 0) {
          window.localStorage.removeItem(DRAFT_KEY);
          return;
        }
        const draft: Draft = {
          body,
          mediaAlt,
          savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Private mode / quota: composing still works, it just is not saved.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [body, mediaAlt, state]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore: there is nothing else to clean up.
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setUploadedUrl(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError(
        `Only JPEG, PNG or WebP photos are accepted. You selected: ${selected.type || "an unknown type"}.`,
      );
      event.target.value = "";
      return;
    }

    if (selected.size > POST_MEDIA_MAX_BYTES) {
      setError(
        `That photo is ${Math.ceil(selected.size / (1024 * 1024))} MB. Choose a picture under 4 MB.`,
      );
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function removePhoto() {
    if (publishing) return;
    setFile(null);
    setUploadedUrl(null);
    setMediaAlt("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!file) return uploadedUrl;
    if (uploadedUrl) return uploadedUrl;

    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/v1/posts/media-upload", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });

    if (response.status === 401) {
      router.push("/login?next=%2Fcompose");
      return null;
    }

    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as {
        error?: { message?: unknown };
      } | null;
      setError(
        typeof failure?.error?.message === "string"
          ? failure.error.message
          : "The photo could not be uploaded. Your caption is still here; remove the photo to publish text only.",
      );
      return null;
    }

    const payload = (await response.json()) as { mediaUrl?: unknown };
    if (typeof payload.mediaUrl !== "string" || !payload.mediaUrl) {
      setError(
        "The server did not confirm the upload. Remove the photo to publish text only.",
      );
      return null;
    }
    setUploadedUrl(payload.mediaUrl);
    return payload.mediaUrl;
  }

  async function publish() {
    if (!body.trim()) {
      setError("Write a caption before publishing.");
      return;
    }
    setState("publishing");
    setError(null);

    try {
      const mediaUrl = file ? await uploadPhoto() : null;
      if (file && !mediaUrl) {
        // Upload failed; stay in the studio with the caption intact.
        setState("idle");
        return;
      }

      const response = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          body: body.trim(),
          ...(mediaUrl ? { mediaUrl } : {}),
          ...(mediaUrl && mediaAlt.trim() ? { mediaAlt: mediaAlt.trim() } : {}),
        }),
      });

      if (response.status === 401) {
        router.push("/login?next=%2Fcompose");
        return;
      }

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        setError(
          typeof failure?.error?.message === "string"
            ? failure.error.message
            : "Your post was not published. Please try again.",
        );
        setState("idle");
        return;
      }

      clearDraft();
      setState("published");
      router.push(`/u/${username}`);
      router.refresh();
    } catch {
      setError("Network problem — your post was not published.");
      setState("idle");
    }
  }

  return (
    <div className="px-4 pb-8 pt-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Create a post
        </h1>
        <Badge tone={state === "published" ? "primary" : "neutral"}>
          {state === "publishing"
            ? "Publishing…"
            : state === "published"
              ? "Published"
              : "Draft"}
        </Badge>
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        Text and one photo. Your post appears on the home feed and your profile
        as soon as the server confirms it.
      </p>

      <div className="mt-4 flex items-start gap-3">
        <Avatar name={displayName} seed={username} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{displayName}</p>
          <p className="text-xs text-ink-muted">@{username}</p>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="compose-caption" className="sr-only">
          Post caption
        </label>
        <textarea
          id="compose-caption"
          value={body}
          maxLength={POST_BODY_MAX_LENGTH}
          rows={6}
          onChange={(event) => {
            setBody(event.target.value);
            setDraftNotice(null);
          }}
          placeholder="What are you making, offering or wondering about? Use #topics to help people find it."
          aria-describedby="compose-caption-hint"
          disabled={publishing}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/70 focus-visible:border-primary disabled:opacity-60"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
          <p id="compose-caption-hint" className="text-xs text-ink-muted">
            {topics.length > 0
              ? `Topics: ${topics.map((topic) => `#${topic}`).join(" ")}`
              : "Add #topics to help discovery find this post."}
          </p>
          <p
            aria-live="polite"
            className={cn(
              "text-xs",
              remaining < 50 ? "font-medium text-warning" : "text-ink-muted",
            )}
          >
            {remaining} characters left
          </p>
        </div>
        {draftNotice ? (
          <p role="status" className="mt-1 text-xs text-ink-muted">
            {draftNotice} Drafts stay in this browser until you publish.
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        aria-label="Choose a photo from your gallery or files"
        onChange={handleFileChange}
        disabled={publishing}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={publishing}
        >
          <Icon name="plus" className="h-4 w-4" />
          {file ? "Replace photo" : "Add photo"}
        </Button>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removePhoto}
            disabled={publishing}
          >
            Remove photo
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">
        JPEG, PNG or WebP, up to 4 MB. Photo upload needs Cloudinary to be
        configured; text-only posts work everywhere.
      </p>

      {file && mediaAlt.length === 0 ? (
        <p className="mt-1 text-[11px] text-ink-muted">
          Adding a short description helps screen-reader users.
        </p>
      ) : null}

      {previewUrl ? (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected post photo preview"
            className="max-h-80 w-full rounded-md border border-border object-cover"
          />
          <div>
            <label
              htmlFor="compose-media-alt"
              className="block text-sm font-medium text-ink"
            >
              Photo description (optional)
            </label>
            <input
              id="compose-media-alt"
              value={mediaAlt}
              maxLength={POST_MEDIA_ALT_MAX_LENGTH}
              onChange={(event) => setMediaAlt(event.target.value)}
              placeholder="Describe the photo for people who cannot see it"
              disabled={publishing}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus-visible:border-primary"
            />
          </div>
        </div>
      ) : null}

      {body.trim() ? (
        <div className="mt-4 rounded-md border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Preview
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
            {body}
          </p>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={mediaAlt || "Photo preview"}
              className="mt-2 max-h-64 w-full rounded-md border border-border object-cover"
            />
          ) : null}
          {topics.length > 0 ? (
            <p className="mt-2 text-xs text-primary">
              {topics.map((topic) => `#${topic}`).join(" ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={publish}
          disabled={!canPublish}
          className="w-full sm:w-auto"
        >
          {publishing ? "Publishing…" : "Publish post"}
        </Button>
        <p className="text-[11px] text-ink-muted">
          {state === "published"
            ? "Published."
            : "Nothing is sent until you press Publish."}
        </p>
      </div>
    </div>
  );
}
