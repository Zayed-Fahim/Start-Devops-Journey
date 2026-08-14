"use client";

import { useCallback, useEffect, useId, useRef } from "react";

/**
 * Accessible dialog primitive shared by the user form and the delete
 * confirmation.
 *
 * A modal is where keyboard accessibility is usually abandoned. The four
 * things that must be true, and are implemented below:
 *
 *   1. Focus MOVES INTO the dialog when it opens. Otherwise a keyboard user's
 *      focus is still on the page behind and Tab walks the hidden content.
 *   2. Focus is TRAPPED. Tab from the last control wraps to the first, and
 *      Shift+Tab from the first wraps to the last.
 *   3. Escape closes it.
 *   4. Focus RETURNS to the element that opened it. Without this, closing a
 *      dialog dumps focus back at <body> and the user has to Tab from the top
 *      of the page to get back to where they were.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Move focus to the first control inside the dialog, falling back to the
    // panel itself (which is tabIndex={-1} so it can receive focus).
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (nodes && nodes.length > 0 ? nodes[0] : panelRef.current)?.focus();

    // Stop the page behind from scrolling while the dialog is open, otherwise
    // a trackpad scroll moves the background and the user loses their place.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;

      // Only restore to a real, still-attached element. If the trigger was
      // unmounted while the dialog was open (a row menu that closed, a row
      // that was deleted), `document.activeElement` was <body> — focusing that
      // is a no-op that silently strands keyboard users, so skip it and let
      // the browser keep its default instead.
      const target = restoreFocusRef.current;
      if (target && target !== document.body && target.isConnected) {
        target.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-0 sm:items-center sm:p-4"
      // Clicking the backdrop closes; clicking inside must not. Comparing
      // target to currentTarget is what distinguishes the two — without it,
      // any click that bubbles up from the form would close the dialog.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? headingId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg rounded-t-2xl border border-border bg-bg p-6 shadow-xl outline-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
