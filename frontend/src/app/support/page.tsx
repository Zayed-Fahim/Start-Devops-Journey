import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { DocumentPanel } from '@/components/DocumentPanel';
import { SupportRequests } from '@/components/SupportRequests';
import { ErrorState } from '@/components/ErrorState';
import { getDocumentPage, getSessionUser, getSupportRequests } from '@/lib/api-server';
import type { DocumentPage, SupportRequestsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Support · User Management' };

export default async function SupportPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  const [pageResult, requestsResult] = await Promise.allSettled([
    getDocumentPage('support'),
    getSupportRequests(),
  ]);

  const page: DocumentPage | null = pageResult.status === 'fulfilled' ? pageResult.value : null;
  const requests: SupportRequestsResponse | null =
    requestsResult.status === 'fulfilled' ? requestsResult.value : null;

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Support</h1>
        <p className="mt-1 text-body-md text-fg-muted">
          {requests?.meta.manages
            ? 'Maintain the support page and work through incoming requests.'
            : 'Read the guidance, then raise a request if you still need help.'}
        </p>
      </div>

      {page ? (
        <DocumentPanel kind="support" page={page} viewer={sessionUser} />
      ) : (
        <ErrorState title="Could not load the support page" message="The API did not respond." />
      )}

      {requests ? (
        <SupportRequests requests={requests} viewer={sessionUser} />
      ) : (
        <ErrorState title="Could not load requests" message="The API did not respond." />
      )}
    </AppShell>
  );
}
