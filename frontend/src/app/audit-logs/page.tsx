import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { AuditFilterBar } from '@/components/AuditFilterBar';
import { AuditTimeline } from '@/components/AuditTimeline';
import { LoadMore } from '@/components/LoadMore';
import { ErrorState } from '@/components/ErrorState';
import { TableSkeleton } from '@/components/Skeletons';
import { ApiFetchError, getAuditLogs, getSessionUser } from '@/lib/api-server';
import type { AuditQuery, AuditLogsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Audit Logs · User Management' };

async function TimelineSection({ query }: { query: AuditQuery }) {
  let result: AuditLogsResponse | null = null;
  let failure: string | null = null;

  try {
    result = await getAuditLogs(query);
  } catch (error) {
    failure =
      error instanceof ApiFetchError
        ? error.message
        : 'An unexpected error occurred while loading audit logs.';
  }

  if (!result)
    return (
      <ErrorState
        title="Could not load audit logs"
        message={failure ?? 'Could not load audit logs.'}
      />
    );

  return (
    <div className="space-y-4">
      <AuditTimeline entries={result.data} meta={result.meta} />
      <LoadMore meta={result.meta} />
    </div>
  );
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<AuditQuery>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');
  if (!sessionUser.permissions?.includes('audit.read')) redirect('/');

  const query = await searchParams;
  const suspenseKey = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined) as [string, string][],
  ).toString();

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Audit Logs</h1>
        <p className="mt-1 text-body-md text-fg-muted">
          A complete history of all user and system actions.
        </p>
      </div>

      <Suspense fallback={<div className="h-16" />}>
        <AuditFilterBar />
      </Suspense>

      <Suspense key={suspenseKey} fallback={<TableSkeleton rows={8} />}>
        <TimelineSection query={query} />
      </Suspense>
    </AppShell>
  );
}
