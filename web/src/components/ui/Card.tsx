import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 sm:p-6",
        "shadow-none",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-ink">{children}</h3>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-6 text-ink-muted">{children}</p>;
}
