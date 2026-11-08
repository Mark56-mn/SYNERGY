"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorNotice, SuccessNotice } from "@/components/auth/AuthNotice";
import { LoadingState } from "@/components/ui/States";
import { postAuthJson } from "@/lib/auth-client";

type Step = "checking" | "confirmed" | "expired" | "none";

/**
 * Post-confirmation landing (`/auth/callback`).
 *
 * Email-confirmation clicks arrive here with the provider session in the
 * URL fragment. As with password recovery, the fragment is read once,
 * converted to HttpOnly cookies through the establish endpoint, and then
 * wiped from the address bar.
 *
 * `error_code=otp_expired` (and any other provider error query param) means
 * the link is dead: the honest answer is an expired-link message, never a
 * fake success.
 */
export function AuthCallback() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const search = new URLSearchParams(window.location.search);
      if (search.get("error") || search.get("error_code")) {
        if (!cancelled) {
          setStep("expired");
        }
        return;
      }
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      if (!accessToken) {
        if (!cancelled) {
          setStep("none");
        }
        return;
      }
      const result = await postAuthJson("/api/v1/auth/establish", {
        accessToken,
        ...(params.get("refresh_token")
          ? { refreshToken: params.get("refresh_token")! }
          : {}),
      });
      if (cancelled) {
        return;
      }
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      if (result.status === 200) {
        setStep("confirmed");
        router.refresh();
      } else {
        setStep("expired");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (step === "checking") {
    return <LoadingState label="Confirming your email…" />;
  }

  if (step === "confirmed") {
    return (
      <div className="space-y-4">
        <SuccessNotice>
          Your email is confirmed and you&apos;re signed in. Welcome to SYNERGY.
        </SuccessNotice>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-base font-semibold text-bg hover:bg-primary-hover"
        >
          Continue to SYNERGY
        </Link>
      </div>
    );
  }

  if (step === "expired") {
    return (
      <div className="space-y-4">
        <ErrorNotice>
          This confirmation link has expired or is invalid. Sign in to request a
          new one from your account settings, or create your account again.
        </ErrorNotice>
        <p className="text-sm text-ink-muted">
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Back to registration
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-ink-muted">
        No confirmation was found in this link. If you just registered, check
        your email for the confirmation message and open the link there.
      </p>
      <p className="text-sm text-ink-muted">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Go to sign in
        </Link>
      </p>
    </div>
  );
}
