import { Suspense } from "react";
import StatCards from "@/components/StatCards";
import { StatCardsSkeleton, TableSkeleton } from "@/components/Skeletons";
import { FilterBar } from "@/components/FilterBar";
import { UsersTable } from "@/components/UsersTable";
import { ErrorState } from "@/components/ErrorState";
import { AddUserButton } from "@/components/AddUserButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApiFetchError, getUsers } from "@/lib/api-server";
import type { UserQuery } from "@/lib/types";

// This page reflects the database on every request; caching it would show
// stale rows straight after a create or delete.
export const dynamic = "force-dynamic";

/**
 * Fetches the current page of users on the SERVER, over Docker's internal
 * network (INTERNAL_API_URL → http://backend:3001).
 *
 * Errors are caught here rather than thrown, so a backend that is still
 * starting degrades to a retryable message inside the page instead of
 * replacing the whole route with error.tsx.
 */
async function UsersSection({ query }: { query: UserQuery }) {
  const isFiltered = Boolean(query.search || query.role || query.status);

  try {
    const { data, meta } = await getUsers(query);
    return <UsersTable users={data} meta={meta} isFiltered={isFiltered} />;
  } catch (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiFetchError
            ? error.message
            : "An unexpected error occurred while loading users."
        }
      />
    );
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  // In Next.js 15 searchParams is a PROMISE. Awaiting it is what marks the
  // render as dynamic; destructuring it synchronously (the Next 14 style) is
  // now a type error.
  searchParams: Promise<UserQuery>;
}) {
  const query = await searchParams;

  // Re-keying the Suspense boundary on the query string is what makes the
  // skeleton reappear for EVERY filter change. Without a changing key React
  // keeps the previous subtree mounted and the user stares at stale rows with
  // no feedback that anything is happening.
  const suspenseKey = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined) as [string, string][]
  ).toString();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="font-semibold">User Management</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Manage your team members and their account status
            </p>
          </div>
          <AddUserButton />
        </div>

        <Suspense fallback={<StatCardsSkeleton />}>
          <StatCards />
        </Suspense>

        {/* FilterBar calls useSearchParams(), which Next requires to sit under
            a Suspense boundary so the shell can stream before the params are
            known. */}
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar />
        </Suspense>

        <Suspense key={suspenseKey} fallback={<TableSkeleton rows={10} />}>
          <UsersSection query={query} />
        </Suspense>
      </main>
    </div>
  );
}
