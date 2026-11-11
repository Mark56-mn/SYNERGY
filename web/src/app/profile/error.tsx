"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorState } from "@/components/ui/States";

export default function ProfileError({
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
    <div className="px-4 py-6 sm:px-5">
      <ErrorState
        title="Your profile could not load"
        description="We could not read your profile just now. Your account and saved photo were not changed."
        retryAction={
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover"
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
        }
      />
    </div>
  );
}
