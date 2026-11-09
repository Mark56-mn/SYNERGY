"use client";

import { ALLOWED_AVATAR_MIME_TYPES, AVATAR_MAX_BYTES } from "@synergy/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

const MAX_BYTES_LABEL = "4 MB";

/**
 * Phone-gallery photo control (TASK-007B).
 *
 * Flow (owner-approved): tap the control → pick from gallery/file picker →
 * preview → cancel / replace / upload → server returns the confirmed HTTPS
 * URL → the parent form saves it with the profile. Until Save succeeds the
 * photo is not marked saved, and a failed upload leaves the previously saved
 * photo untouched.
 *
 * Client validation is for usability only; the server re-checks type (by
 * magic bytes), size and dimensions and is the security authority.
 */
export function AvatarUpload({
  displayName,
  username,
  currentUrl,
  onUploaded,
  disabled,
}: {
  displayName: string;
  username: string;
  currentUrl: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function choose() {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setStatus(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (
      !(ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(selected.type)
    ) {
      setError(
        `Only JPEG, PNG or WebP photos are accepted. You selected: ${selected.type || "an unknown type"}.`,
      );
      event.target.value = "";
      return;
    }

    if (selected.size > AVATAR_MAX_BYTES) {
      setError(
        `That photo is ${Math.ceil(selected.size / (1024 * 1024))} MB. Choose a picture under ${MAX_BYTES_LABEL}.`,
      );
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function cancel() {
    if (uploading) return;
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/profile/avatar-upload", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/profile/edit")}`);
        return;
      }

      if (response.status === 503) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        setError(
          typeof body?.error?.message === "string"
            ? body.error.message
            : "Photo uploads are not configured yet.",
        );
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        setError(
          typeof body?.error?.message === "string"
            ? body.error.message
            : "The photo could not be uploaded. Your previous photo was not changed.",
        );
        return;
      }

      const body = (await response.json()) as { avatarUrl?: unknown };
      if (typeof body.avatarUrl !== "string" || body.avatarUrl.length === 0) {
        setError(
          "The server did not confirm the upload. Your previous photo was not changed.",
        );
        return;
      }

      onUploaded(body.avatarUrl);
      cancel();
      setStatus("Photo uploaded. Press Save profile to apply it.");
    } catch {
      setError(
        "Network problem — the photo was not uploaded and your previous photo was not changed.",
      );
    } finally {
      setUploading(false);
    }
  }

  const shownUrl = previewUrl ?? currentUrl ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar
          name={displayName || "Member"}
          seed={username || "member"}
          size="xl"
          src={shownUrl}
          className="border-4 border-bg"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">Profile photo</p>
          <p className="text-xs text-ink-muted">
            JPEG, PNG or WebP, up to {MAX_BYTES_LABEL}. Choose from your phone
            gallery or files.
          </p>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {status ?? ""}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a profile photo from your gallery or files"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={choose}
          disabled={disabled || uploading}
        >
          {file
            ? "Replace photo"
            : currentUrl
              ? "Change photo"
              : "Choose photo"}
        </Button>

        {file ? (
          <>
            <Button
              type="button"
              onClick={upload}
              disabled={disabled || uploading}
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={cancel}
              disabled={uploading}
            >
              Cancel
            </Button>
          </>
        ) : null}
      </div>

      {previewUrl ? (
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="mb-2 text-xs font-medium text-ink-muted">
            Preview — upload it, then press Save profile to apply.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected photo preview"
            className="h-32 w-32 rounded-full border border-border object-cover"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
