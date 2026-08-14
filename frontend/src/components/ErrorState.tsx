'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function ErrorState({
  message,
  title = 'Could not load this view',
}: {
  message: string;
  title?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-6 py-16 text-center"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-10 text-danger"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5" strokeLinecap="round" />
        <circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none" />
      </svg>

      <h2 className="text-headline-md">{title}</h2>
      <p className="max-w-md text-body-sm text-fg-muted">{message}</p>

      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}
