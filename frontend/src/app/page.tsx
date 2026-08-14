import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import StatCards from '@/components/StatCards';
import { StatCardsSkeleton, TableSkeleton } from '@/components/Skeletons';
import { FilterBar } from '@/components/FilterBar';
import { UsersTable } from '@/components/UsersTable';
import { ErrorState } from '@/components/ErrorState';
import { AddUserButton } from '@/components/AddUserButton';
import { TopNav } from '@/components/TopNav';
import { ApiFetchError, getUsers, getSessionUser } from '@/lib/api-server';
import type { UserQuery, UsersResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function UsersSection({ query, canManage }: { query: UserQuery; canManage: boolean }) {
  const isFiltered = Boolean(query.search || query.role || query.status);

  let result: UsersResponse | null = null;
  let failure: string | null = null;

  try {
    result = await getUsers(query);
  } catch (error) {
    failure =
      error instanceof ApiFetchError
        ? error.message
        : 'An unexpected error occurred while loading users.';
  }

  if (!result)
    return <ErrorState title="Could not load users" message={failure ?? 'Could not load users.'} />;

  return (
    <UsersTable
      users={result.data}
      meta={result.meta}
      isFiltered={isFiltered}
      canManage={canManage}
    />
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<UserQuery>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  const granted = sessionUser.permissions ?? [];
  const canManage = ['users.create', 'users.update', 'users.delete'].some((key) =>
    granted.includes(key),
  );
  const query = await searchParams;
  const suspenseKey = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined) as [string, string][],
  ).toString();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <TopNav user={sessionUser} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Manage your team members and their account status
            </p>
          </div>
          {canManage && <AddUserButton />}
        </div>

        <Suspense fallback={<StatCardsSkeleton />}>
          <StatCards />
        </Suspense>

        <Suspense fallback={<div className="h-10" />}>
          <FilterBar />
        </Suspense>

        <Suspense key={suspenseKey} fallback={<TableSkeleton rows={10} />}>
          <UsersSection query={query} canManage={canManage} />
        </Suspense>
      </main>
    </div>
  );
}
