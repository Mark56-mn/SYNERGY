"use client";

import { InputHTMLAttributes, useId } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const fieldStyles =
  "w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-ink " +
  "placeholder:text-ink-muted/70 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Labelled text field with hint and error slots. The error is wired with
 * `aria-describedby` and `aria-invalid`, and the hint is announced once.
 */
export function TextField({
  label,
  hint,
  error,
  className,
  id: idProp,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hintId, errorId].filter(Boolean).join(" ") || undefined
        }
        className={cn(fieldStyles, error && "border-danger")}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Search field. The behaviour is deliberately local (it filters demonstration
 * content in the browser); the visible hint says so, so the control never
 * pretends to run a backend search.
 */
export function SearchField({
  label = "Search",
  placeholder = "Search people, communities, services…",
  value,
  onChange,
  className,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(fieldStyles, "pl-9 pr-3 text-sm")}
      />
    </div>
  );
}
