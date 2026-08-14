'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBell } from './NavIcons';

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
        className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-sm transition-colors hover:border-border-strong hover:text-fg"
      >
        {IconBell}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-label-md">Notifications</p>
          </div>
          <p className="px-3 py-6 text-center text-body-sm text-fg-muted">
            Nothing new. Account and role changes are recorded in the audit log.
          </p>
        </div>
      )}
    </div>
  );
}
