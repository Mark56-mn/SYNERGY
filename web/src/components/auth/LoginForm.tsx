"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ErrorNotice, SuccessNotice } from "@/components/auth/AuthNotice";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { postAuthJson, serverErrorMessage } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/safe-redirect";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign-in form. Submits credentials to the server-only auth endpoint; the
 * server sets HttpOnly session cookies and the router navigates to the
 * (validated) destination. Passwords are never stored client-side and the
 * form never pretends success before the server answers.
 */
export function LoginForm({
  next = "/",
  initialNotice,
  onSuccess,
}: {
  next?: string;
  initialNotice?: string;
  onSuccess?: (destination: string) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const errors: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length === 0) {
      errors.password = "Enter your password.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const result = await postAuthJson("/api/v1/auth/login", {
        email: email.trim(),
        password,
        next,
      });
      if (result.status === 200 && result.body?.["ok"] === true) {
        const destination =
          typeof result.body["next"] === "string"
            ? safeNextPath(result.body["next"])
            : safeNextPath(next);
        if (onSuccess) {
          onSuccess(destination);
        } else {
          router.push(destination);
          router.refresh();
        }
        return;
      }
      setFormError(
        serverErrorMessage(
          result,
          "We couldn't sign you in. Check your connection and try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
      <div className="space-y-4">
        {initialNotice ? <SuccessNotice>{initialNotice}</SuccessNotice> : null}
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
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          disabled={submitting}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </form>
  );
}
