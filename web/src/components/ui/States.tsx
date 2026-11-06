import { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Text-free skeleton block; animation is disabled under reduced motion via globals.css. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-raised", className)}
    />
  );
}

/** Rhythmic loading block for list-shaped content. Portion of the page, not a modal. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-5/6" />
      <Skeleton className="h-16 w-4/6" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 p-6 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  retryAction,
}: {
  title?: string;
  description?: string;
  retryAction?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-surface p-6 text-center"
    >
      <p className="text-base font-semibold text-danger">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      ) : null}
      {retryAction ? (
        <div className="mt-4 flex justify-center">{retryAction}</div>
      ) : null}
    </div>
  );
}
