"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ErrorNotice, SuccessNotice } from "@/components/auth/AuthNotice";
import { PasswordField } from "@/components/auth/PasswordField";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { postAuthJson, serverErrorMessage } from "@/lib/auth-client";

type Step = "checking" | "form" | "invalid" | "done";

/**
 * Password-reset flow.
 *
 * Recovery emails land here with the provider session in the URL fragment
 * (`#access_token=…&type=recovery`). A fragment is never sent to any server
 * by the browser, so this component reads it once, hands it to the
 * establish endpoint (which verifies it provider-side and converts it to
 * HttpOnly cookies), then wipes the fragment from the address bar before
 * showing the form.
 *
 * When the page's server check already found a valid session
 * (`hasSession`), the fragment step is skipped entirely.
 */
export function ResetPasswordFlow({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(hasSession ? "form" : "checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasSession) {
      return;
    }
    let cancelled = false;
    async function establishFromHash() {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      if (!accessToken) {
        if (!cancelled) {
          setStep("invalid");
        }
        return;
      }
      const refreshToken = params.get("refresh_token") ?? undefined;
      const expiresInRaw = params.get("expires_in");
      const expiresIn = expiresInRaw
        ? Number.parseInt(expiresInRaw, 10)
        : undefined;
      const result = await postAuthJson("/api/v1/auth/establish", {
        accessToken,
        ...(refreshToken ? { refreshToken } : {}),
        ...(Number.isFinite(expiresIn) ? { expiresIn } : {}),
      });
      if (cancelled) {
        return;
      }
      // The tokens leave the address bar as soon as they have been handed
      // to the server — they must not linger in history or screenshots.
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      setStep(result.status === 200 ? "form" : "invalid");
    }
    void establishFromHash();
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const errors: typeof fieldErrors = {};
    if (password.length < 8) {
      errors.password = "Use at least 8 characters.";
    }
    if (confirmPassword !== password) {
      errors.confirm = "Passwords don't match.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await postAuthJson("/api/v1/auth/update-password", {
        password,
      });
      if (result.status === 200) {
        setStep("done");
        router.refresh();
        return;
      }
      setFormError(
        serverErrorMessage(
          result,
          "We couldn't update your password. Check your connection and try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "checking") {
    return <LoadingState label="Verifying your reset link…" />;
  }

  if (step === "invalid") {
    return (
      <ErrorState
        title="This reset link is invalid or has expired"
        description="Reset links expire and can only be used once. Request a new one and try again."
        retryAction={
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-bg hover:bg-primary-hover"
          >
            Request a new reset link
          </Link>
        }
      />
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <SuccessNotice>
          Your password has been updated. Sign in with your new password.
        </SuccessNotice>
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="space-y-4">
        {formError ? <ErrorNotice>{formError}</ErrorNotice> : null}
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="At least 8 characters."
          error={fieldErrors.password}
          disabled={submitting}
        />
        <PasswordField
          label="Confirm new password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={fieldErrors.confirm}
          disabled={submitting}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
