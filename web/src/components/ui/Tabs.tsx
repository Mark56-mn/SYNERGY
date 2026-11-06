"use client";

import { KeyboardEvent, useRef } from "react";

import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  /** Optional count, announced as part of the label. */
  count?: number;
}

/**
 * Accessible tab strip (WAI-ARIA tabs pattern): arrow keys, Home/End, one
 * tab stop for the whole strip. Panels are rendered by the parent, which owns
 * `value`.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function moveFocus(nextIndex: number) {
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = buttons?.[(nextIndex + items.length) % items.length];
    target?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      moveFocus(index + direction);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(items.length - 1);
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        // Tabs wrap rather than clip: on a 360px screen every label stays
        // readable without a hidden horizontal scroller.
        "flex flex-wrap gap-x-1 border-b border-border",
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors sm:px-4",
              "-mb-px border-b-2",
              selected
                ? "border-primary text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className="ml-1.5 text-xs text-ink-muted">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
