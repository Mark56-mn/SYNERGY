"use client";

import { useEffect } from "react";

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
    <div className="mx-auto flex min-h-dvh max-w-content flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
      <p className="text-sm text-ink-muted">
        The page could not be displayed. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg"
      >
        Try again
      </button>
    </div>
  );
}
