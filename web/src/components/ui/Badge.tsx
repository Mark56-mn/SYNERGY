import { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "border-border bg-surface-raised text-ink-muted",
  primary: "border-primary bg-primary/10 text-primary",
  warning: "border-warning bg-warning/10 text-warning",
  danger: "border-danger bg-danger/10 text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
