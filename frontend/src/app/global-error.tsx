'use client';

import './globals.css';
import {
  ErrorScreen,
  IconDashboard,
  IconRetry,
  primaryActionClass,
  secondaryActionClass,
} from '@/components/ErrorScreen';

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
  const meta = ['ERR_CODE: 500_INTERNAL_SERVER_ERROR'];
  if (error.digest) meta.push(`REF: ${error.digest}`);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>500 Internal Server Error · User Management</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ErrorScreen
          decorated
          code="500"
          title="Server Error"
          description="Something went wrong on our end. Reloading usually clears it — if it keeps happening, check that the API is running."
          meta={meta}
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className={primaryActionClass}
              >
                {IconDashboard}
                Back to Dashboard
              </button>
              <button type="button" onClick={reset} className={secondaryActionClass}>
                {IconRetry}
                Try again
              </button>
            </>
          }
        />
      </body>
    </html>
  );
}
