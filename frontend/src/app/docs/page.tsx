import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { DocumentPanel } from '@/components/DocumentPanel';
import { ErrorState } from '@/components/ErrorState';
import { getDocumentPage, getSessionUser } from '@/lib/api-server';
import type { DocumentPage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Docs · User Management' };

export default async function DocsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  let page: DocumentPage | null = null;
  try {
    page = await getDocumentPage('docs');
  } catch {
    page = null;
  }

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Docs</h1>
        <p className="mt-1 text-body-md text-fg-muted">
          How this dashboard works. {page?.canEdit ? 'You can edit this page.' : 'Read only.'}
        </p>
      </div>

      {page ? (
        <DocumentPanel kind="docs" page={page} viewer={sessionUser} />
      ) : (
        <ErrorState title="Could not load the docs" message="The API did not return the page." />
      )}
    </AppShell>
  );
}
