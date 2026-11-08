"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ErrorNotice, SuccessNotice } from "@/components/auth/AuthNotice";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { postAuthJson, serverErrorMessage } from "@/lib/auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Registration form. The provider may require email confirmation: when it
 * does, the server sets NO session cookie and returns
 * `confirmation-required`, and this form shows the check-your-email state
 * instead of pretending the user is signed in.
 */
export function RegisterForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const errors: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
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
      const result = await postAuthJson("/api/v1/auth/register", {
        email: email.trim(),
        password,
      });
      if (result.status === 200 && result.body?.["ok"] === true) {
        if (result.body["status"] === "confirmation-required") {
          setNeedsConfirmation(true);
          return;
        }
        if (onSignedIn) {
          onSignedIn();
        } else {
          router.push("/");
          router.refresh();
        }
        return;
      }
      setFormError(
        serverErrorMessage(
          result,
          "We couldn't create your account. Check your connection and try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="space-y-4">
        <SuccessNotice>
          Check your email for a confirmation link. You&apos;ll be signed in
          once you confirm your address — until then, this account isn&apos;t
          active.
        </SuccessNotice>
        <p className="text-sm text-ink-muted">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="space-y-4">
        {formError ? <ErrorNotice>{formError}</ErrorNotice> : null}
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          disabled={submitting}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          error={fieldErrors.password}
          disabled={submitting}
        />
        <PasswordField
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={fieldErrors.confirm}
          disabled={submitting}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
