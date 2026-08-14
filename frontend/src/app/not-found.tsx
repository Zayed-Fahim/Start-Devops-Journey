import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page not found · User Management' };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-10 text-fg-muted"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          <path d="M8.5 11h5" strokeLinecap="round" />
        </svg>

        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-fg-muted">
          That page does not exist. If you followed a link from inside the dashboard, the record may
          have been deleted since.
        </p>

        <Link
          href="/"
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Back to users
        </Link>
      </div>
    </main>
  );
}
