'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ErrorScreen,
  IconBack,
  IconDashboard,
  primaryActionClass,
  secondaryActionClass,
} from './ErrorScreen';

export function NotFoundScreen() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      description="The page you are looking for doesn't exist or has been moved."
      meta={['ERR_CODE: 404_NOT_FOUND', `PATH: ${pathname}`]}
      actions={
        <>
          <Link href="/" className={primaryActionClass}>
            {IconDashboard}
            Back to Dashboard
          </Link>
          <button type="button" onClick={() => router.back()} className={secondaryActionClass}>
            {IconBack}
            Go back
          </button>
        </>
      }
    />
  );
}
