import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

/**
 * Shared frame for the auth screens (login, register, recovery, reset,
 * callback, account). Navy surface, mint accents, one column that reflows
 * from 360px phones to desktop — the same visual language as the rest of
 * the app shell, with no extra illustration or animation weight.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="flex items-center gap-2 text-base font-bold tracking-tight text-primary"
      >
        <Icon name="sparkles" className="h-4 w-4" />
        SYNERGY
      </Link>
      <Card className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </Card>
      {footer ? (
        <p className="mt-4 text-center text-sm text-ink-muted">{footer}</p>
      ) : null}
    </div>
  );
}
