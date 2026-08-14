'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-fg-muted">
          The dashboard hit an unexpected error.
          {error.digest && (
            <>
              {' '}
              Reference: <code className="font-mono">{error.digest}</code>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
