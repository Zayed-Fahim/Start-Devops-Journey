'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/api-browser';
import { initials } from '@/lib/utils';
import type { SessionUser } from '@/lib/types';

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight">{user.name}</p>
        <p className="text-label-sm text-fg-muted">{user.role ?? 'No role'}</p>
      </div>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-fg-muted"
      >
        {initials(user.name)}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={signingOut}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
