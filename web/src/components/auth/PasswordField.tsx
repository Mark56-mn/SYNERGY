"use client";

import { InputHTMLAttributes, useId, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Password input with a show/hide toggle (TASK-006B rule: login and
 * registration both need visibility controls). The toggle is a real button
 * with `aria-pressed` and a changing accessible name, so it is operable by
 * keyboard and announced correctly. Errors are wired with `aria-describedby`
 * + `aria-invalid`, matching the app's `TextField` behaviour.
 */
export function PasswordField({
  label,
  hint,
  error,
  value,
  onChange,
  name,
  autoComplete,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  autoComplete?: string;
  className?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, "disabled">) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full rounded-md border border-border bg-surface py-2.5 pl-3 pr-20 text-base text-ink",
            "placeholder:text-ink-muted/70 focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error && "border-danger",
          )}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1.5 text-xs font-semibold text-ink-muted hover:text-primary"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
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
