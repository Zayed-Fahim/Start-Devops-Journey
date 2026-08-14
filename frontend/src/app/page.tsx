import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import StatCards from '@/components/StatCards';
import { StatCardsSkeleton, TableSkeleton } from '@/components/Skeletons';
import { FilterBar } from '@/components/FilterBar';
import { UsersTable } from '@/components/UsersTable';
import { ErrorState } from '@/components/ErrorState';
import { AddUserButton } from '@/components/AddUserButton';
import { AppShell } from '@/components/AppShell';
import { ApiFetchError, getUsers, getUserStats, getSessionUser } from '@/lib/api-server';
import type { UserQuery, UsersResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function UsersSection({
  query,
  canManage,
  roles,
}: {
  query: UserQuery;
  canManage: boolean;
  roles: string[];
}) {
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
      roles={roles}
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
  const roles = await getUserStats()
    .then((stats) => stats.roles)
    .catch(() => [] as string[]);
  const query = await searchParams;
  const suspenseKey = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined) as [string, string][],
  ).toString();

  return (
    <AppShell user={sessionUser}>
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-headline-lg">User Management</h1>
          <p className="mt-xs text-body-md text-fg-muted">
            Manage system access and roles across the organization.
          </p>
        </div>
        {canManage && <AddUserButton roles={roles} />}
      </div>

      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCards />
      </Suspense>

      <Suspense fallback={<div className="h-10" />}>
        <FilterBar roles={roles} />
      </Suspense>

      <Suspense key={suspenseKey} fallback={<TableSkeleton rows={10} />}>
        <UsersSection query={query} canManage={canManage} roles={roles} />
      </Suspense>
    </AppShell>
  );
}
