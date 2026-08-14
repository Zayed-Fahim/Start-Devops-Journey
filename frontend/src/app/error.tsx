'use client';

import Link from 'next/link';
import {
  ErrorScreen,
  IconDashboard,
  IconRetry,
  primaryActionClass,
  secondaryActionClass,
} from '@/components/ErrorScreen';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const meta = ['ERR_CODE: 500_INTERNAL_SERVER_ERROR'];
  if (error.digest) meta.push(`REF: ${error.digest}`);

  return (
    <ErrorScreen
      decorated
      code="500"
      title="Server Error"
      description="Something went wrong on our end. Reloading usually clears it — if it keeps happening, check that the API is running."
      meta={meta}
      actions={
        <>
          <Link href="/" className={primaryActionClass}>
            {IconDashboard}
            Back to Dashboard
          </Link>
          <button type="button" onClick={reset} className={secondaryActionClass}>
            {IconRetry}
            Try again
          </button>
        </>
      }
    />
  );
}
