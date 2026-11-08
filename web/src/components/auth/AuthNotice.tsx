import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";

/**
 * Form-level notices. Success uses `role="status"` (polite), errors use
 * `role="alert"` so screen readers announce them without a page reload.
 * Colours come from the design tokens (mint success / danger).
 */
export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm leading-5 text-ink"
    >
      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/40 bg-surface-raised p-3 text-sm leading-5 text-ink"
    >
      <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <span>{children}</span>
    </p>
  );
}
