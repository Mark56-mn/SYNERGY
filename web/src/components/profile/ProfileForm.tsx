"use client";

import { normalizeUsername } from "@synergy/domain";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";

/**
 * Onboarding / edit form (TASK-007 §4B, §4C; TASK-007B adds phone-gallery
 * photo upload).
 *
 * The server is the only authority: this form preflights username availability
 * for a friendlier message, but every rule (normalisation, uniqueness,
 * visibility, field bounds) is re-checked server-side, and a lost race returns
 * 409 which is shown on the username field. Nothing reports success before the
 * API confirms the write.
 */

type Mode = "onboarding" | "edit";
type Visibility = "public" | "private";

export interface ProfileFormInitial {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  visibility: Visibility;
}

export function ProfileForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: ProfileFormInitial;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? "public",
  );
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const normalized = normalizeUsername(username);
  const isOnboarding = mode === "onboarding";

  async function checkAvailability() {
    if (normalized.length < 3) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    try {
      const response = await fetch(
        `/api/v1/profile/username-availability?username=${encodeURIComponent(normalized)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) {
        setAvailability("idle");
        return;
      }
      const body = (await response.json()) as {
        username: string;
        available: boolean;
      };
      setAvailability(body.available ? "available" : "taken");
    } catch {
      setAvailability("idle");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    setStatus(null);

    try {
      const response = await fetch(
        isOnboarding ? "/api/v1/profile/onboarding" : "/api/v1/profile",
        {
          method: isOnboarding ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            username: normalized,
            displayName,
            bio,
            avatarUrl: avatarUrl.trim(),
            visibility,
          }),
        },
      );

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(isOnboarding ? "/onboarding" : "/profile/edit")}`,
        );
        return;
      }

      if (response.status === 409) {
        setFieldErrors({ username: "That username is already taken." });
        setStatus("Profile not saved.");
        return;
      }

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        const message =
          typeof failure?.error?.message === "string"
            ? failure.error.message
            : "Your profile could not be saved.";
        setFormError(message);
        return;
      }

      setStatus(isOnboarding ? "Profile created." : "Profile updated.");
      router.push("/profile");
      router.refresh();
    } catch {
      setFormError(
        "Network problem — your profile was not saved. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const usernameHint =
    availability === "checking"
      ? "Checking availability…"
      : availability === "available"
        ? "Available."
        : availability === "taken"
          ? "Already taken."
          : normalized && normalized !== username
            ? `Will be saved as @${normalized}`
            : "3–30 characters: lowercase letters, numbers or underscores.";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <TextField
          label="Username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setAvailability("idle");
          }}
          onBlur={checkAvailability}
          hint={usernameHint}
          error={fieldErrors.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <p aria-live="polite" className="sr-only">
          {availability === "idle" ? "" : usernameHint}
        </p>
      </div>

      <TextField
        label="Display name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={fieldErrors.displayName}
        hint="The name other members see."
        maxLength={80}
        autoComplete="name"
        required
      />

      <div className="space-y-1.5">
        <label
          htmlFor="profile-bio"
          className="block text-sm font-medium text-ink"
        >
          Bio (optional)
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={280}
          rows={4}
          aria-describedby="profile-bio-hint"
          aria-invalid={fieldErrors.bio ? true : undefined}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/70 focus-visible:border-primary"
          placeholder="What do you make, offer or care about?"
        />
        <p id="profile-bio-hint" className="text-xs text-ink-muted">
          {bio.length}/280 characters.
        </p>
      </div>

      <AvatarUpload
        displayName={displayName}
        username={normalized || initial?.username || ""}
        currentUrl={avatarUrl}
        disabled={pending}
        onUploaded={(url) => {
          setAvatarUrl(url);
          setFieldErrors((previous) => ({ ...previous, avatarUrl: undefined }));
        }}
      />
      {fieldErrors.avatarUrl ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {fieldErrors.avatarUrl}
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">
          Profile visibility
        </legend>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="visibility"
            value="public"
            checked={visibility === "public"}
            onChange={() => setVisibility("public")}
            className="mt-1"
          />
          <span>
            Public — anyone with your username can see your name and bio.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="radio"
            name="visibility"
            value="private"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
            className="mt-1"
          />
          <span>
            Private — only you can see it; other visitors are told it does not
            exist.
          </span>
        </label>
      </fieldset>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="text-sm text-ink-muted">
        {status ?? ""}
      </p>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending
          ? "Saving…"
          : isOnboarding
            ? "Create my profile"
            : "Save changes"}
      </Button>
    </form>
  );
}
