'use client';

import { logout } from '@/lib/api-browser';
import type { SessionUser } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { RoleBadge } from './Badges';
import { IconSettings } from './NavIcons';

const IconSignOut = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

const avatarClass =
  'grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent/30 to-accent/10 text-label-sm font-semibold text-fg ring-1 ring-border';

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  const itemClass =
    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body-sm text-fg-muted transition-colors hover:bg-fg/5 hover:text-fg';

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-transparent p-1 transition-colors hover:bg-fg/5',
          open && 'border-border bg-fg/5',
        )}
      >
        <span aria-hidden="true" className={cn(avatarClass, 'size-8')}>
          {initials(user.name)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
        >
          <div className="flex items-start gap-3 border-b border-border px-3 py-3">
            <span aria-hidden="true" className={cn(avatarClass, 'size-9')}>
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-medium">{user.name}</span>
              <span className="block truncate font-mono text-label-sm text-fg-muted">
                {user.email}
              </span>
              <span className="mt-1.5 block">
                <RoleBadge role={user.role} />
              </span>
            </span>
          </div>

          <div className="p-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              {IconSettings}
              Account settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={signingOut}
              className={cn(itemClass, 'text-danger hover:bg-danger/10 hover:text-danger')}
            >
              {IconSignOut}
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
