"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Root-level error boundary required by the App Router for failures that
 * escape the normal `error.tsx` boundary (including root-layout failures).
 * It renders its own <html>/<body> because the root layout may be unavailable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-ink">
        <div className="mx-auto flex min-h-dvh max-w-content flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
          <p className="text-sm text-ink-muted">
            SYNERGY could not load this page. Your data was not changed. Please
            try again, or return home.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 text-sm font-semibold text-ink"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
