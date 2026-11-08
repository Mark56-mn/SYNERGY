"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { ErrorNotice, SuccessNotice } from "@/components/auth/AuthNotice";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { postAuthJson } from "@/lib/auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password-recovery request form. The confirmation copy is identical whether
 * or not the email belongs to an account (the server guarantees this too),
 * so the form is no oracle either.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || sent) {
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setFieldError(undefined);
    setNetworkError(null);
    setSubmitting(true);
    try {
      const result = await postAuthJson("/api/v1/auth/forgot-password", {
        email: email.trim(),
      });
      if (result.status === 0) {
        setNetworkError(
          "We couldn't send that request. Check your connection and try again.",
        );
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <SuccessNotice>
          If an account exists for that email, a password reset link is on its
          way. Reset links expire — check spam if it doesn&apos;t arrive.
        </SuccessNotice>
        <p className="text-sm text-ink-muted">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="space-y-4">
        {networkError ? <ErrorNotice>{networkError}</ErrorNotice> : null}
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError}
          disabled={submitting}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
        <p className="text-center text-sm text-ink-muted">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
