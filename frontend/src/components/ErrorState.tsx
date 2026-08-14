"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * The state everyone forgets. When the API is unreachable — backend still
 * starting, DATABASE_URL wrong, container crashed — the user must see WHAT
 * failed and get a way to retry, not an empty table that implies "no data".
 */
export function ErrorState({ message }: { message: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      // role="alert" makes a screen reader announce this immediately rather
      // than only on next focus — an error is worth interrupting for.
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-6 py-16 text-center"
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

      <h2 className="text-base font-semibold">Could not load users</h2>
      <p className="max-w-md text-sm text-fg-muted">{message}</p>

      <button
        type="button"
        // router.refresh() re-runs the Server Components and re-fetches on the
        // server. A plain location.reload() would work too but throws away the
        // whole client tree, including any open dialog and scroll position.
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
