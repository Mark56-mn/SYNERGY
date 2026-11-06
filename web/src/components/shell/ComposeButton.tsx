"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";

const MAX_CHARS = 5000;

/**
 * Post composer preview.
 *
 * There is no publish endpoint yet (content persistence is TASK-007A), so this
 * dialog deliberately offers a PREVIEW instead of a publish action: no success
 * message is shown, nothing is written anywhere, and the copy says so.
 */
export function ComposeButton({ variant }: { variant: "sidebar" | "fab" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const remaining = MAX_CHARS - text.length;

  return (
    <>
      {variant === "sidebar" ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full"
          aria-haspopup="dialog"
        >
          <Icon name="plus" className="h-4 w-4" />
          Create
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Create a post (preview)"
          className="-mt-4 flex h-14 w-14 items-center justify-center rounded-full border border-bg bg-primary text-bg shadow-raised transition-colors hover:bg-primary-hover"
        >
          <Icon name="plus" className="h-6 w-6" />
        </button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create a post"
        description="Layout preview only. Posting arrives with the content task — nothing you type here is saved or published."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button type="button" disabled>
              Post (not available yet)
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="compose-body"
              className="block text-sm font-medium text-ink"
            >
              Post text
            </label>
            <textarea
              id="compose-body"
              value={text}
              maxLength={MAX_CHARS}
              rows={5}
              onChange={(event) => setText(event.target.value)}
              placeholder="Share an update, a question, or something you made…"
              className="mt-1.5 w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/70 focus-visible:border-primary"
            />
            <p className="mt-1 text-right text-xs text-ink-muted">
              {remaining} characters left
            </p>
          </div>

          {text.trim().length > 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Preview
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                {text}
              </p>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-ink-muted">
              Start typing to see how your post will look in the feed.
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
