"use client";

import { useState } from "react";
import { UserFormModal } from "./UserFormModal";

/**
 * A small Client Component island so the page header itself can stay a Server
 * Component. Only the button and its dialog ship JavaScript to the browser;
 * the surrounding layout is rendered once on the server and never hydrated.
 */
export function AddUserButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90"
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Add user
      </button>

      {/* Remounted per open via `key`, so a cancelled form does not reappear
          with the abandoned values still in it. */}
      {open && <UserFormModal key={String(open)} open onClose={() => setOpen(false)} />}
    </>
  );
}
