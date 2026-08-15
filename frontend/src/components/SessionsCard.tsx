'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, revokeOtherSessions, revokeSession } from '@/lib/api-browser';
import type { SessionSummary, SessionUser } from '@/lib/types';
import { formatDateTime } from '@/lib/datetime';

export function SessionsCard({
  sessions,
  viewer,
}: {
  sessions: SessionSummary[];
  viewer: SessionUser;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const others = sessions.filter((session) => !session.current).length;

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update sessions.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2">
        <div>
          <h2 className="text-headline-md">Active sessions</h2>
          <p className="mt-0.5 text-body-sm text-fg-muted">
            Devices currently signed in to your account.
          </p>
        </div>
        {others > 0 && (
          <button
            type="button"
            onClick={() => run('all', revokeOtherSessions)}
            disabled={busy !== null}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-60"
          >
            {busy === 'all'
              ? 'Signing out…'
              : `Sign out ${others} other session${others === 1 ? '' : 's'}`}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="border-b border-border bg-danger/5 px-6 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <ul className="divide-y divide-border">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center gap-4 px-6 py-4">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-fg-muted"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4"
              >
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8" strokeLinecap="round" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {session.device}
                {session.current && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    This device
                  </span>
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-label-sm text-fg-muted">
                <span>{session.ip ?? 'unknown ip'}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={session.lastUsedAt}>
                  {formatDateTime(session.lastUsedAt, viewer)}
                </time>
              </p>
            </div>

            {!session.current && (
              <button
                type="button"
                onClick={() => run(session.id, () => revokeSession(session.id))}
                disabled={busy !== null}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
              >
                {busy === session.id ? 'Revoking…' : 'Revoke'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
