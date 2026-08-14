"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary — the last line of defence.
 *
 * The dashboard already handles an unreachable API inline (see UsersSection),
 * so this only fires for genuinely unexpected failures: a render crash, a bad
 * prop, a bug. It must be a Client Component; Next.js requires that, because
 * it has to attach a reset handler in the browser.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where a real app would report to Sentry or
    // similar. The `digest` is the server-side correlation id Next generates —
    // the actual message is withheld from the browser on purpose, so the
    // digest is how you find the matching entry in the server logs.
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
              {" "}
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
