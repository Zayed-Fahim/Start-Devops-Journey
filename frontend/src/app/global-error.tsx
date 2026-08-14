'use client';

import './globals.css';

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-10 text-danger"
              aria-hidden="true"
            >
              <path d="M12 4 3 19h18z" strokeLinejoin="round" />
              <path d="M12 10v4" strokeLinecap="round" />
              <circle cx="12" cy="16.75" r="0.75" fill="currentColor" stroke="none" />
            </svg>

            <h1 className="text-xl font-semibold">The dashboard could not start</h1>
            <p className="text-sm text-fg-muted">
              Something failed before the page could render. Reloading usually clears it. If it
              keeps happening, check that the API is running.
            </p>
            {error.digest && (
              <p className="text-xs text-fg-muted">
                Reference: <code className="font-mono">{error.digest}</code>
              </p>
            )}

            <button
              type="button"
              onClick={reset}
              className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              Reload the dashboard
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
