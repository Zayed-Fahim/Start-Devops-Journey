'use client';

import { useEffect, useState } from 'react';
import { useQueryParams } from '@/lib/useQueryParams';
import { STATUSES } from '@/lib/types';
import { Select } from './Select';

export function FilterBar({ roles }: { roles: string[] }) {
  const { searchParams, setParams } = useQueryParams();
  const urlSearch = searchParams.get('search') ?? '';
  const role = searchParams.get('role') ?? '';
  const status = searchParams.get('status') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);

  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearch(urlSearch);
  }

  useEffect(() => {
    if (search === urlSearch) return undefined;
    const timer = setTimeout(() => {
      setParams({ search, page: undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, urlSearch, setParams]);
  const hasFilters = Boolean(urlSearch || role || status);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users by name or email"
          className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent"
        />
      </div>

      <Select
        value={role}
        onChange={(next) => setParams({ role: next, page: undefined })}
        label="Filter by role"
        placeholder="All roles"
        className="sm:w-44"
        options={[
          { value: '', label: 'All roles' },
          ...roles.map((value) => ({ value, label: value })),
        ]}
      />

      <Select
        value={status}
        onChange={(next) => setParams({ status: next, page: undefined })}
        label="Filter by status"
        placeholder="All statuses"
        className="sm:w-44"
        options={[
          { value: '', label: 'All statuses' },
          ...STATUSES.map((value) => ({ value, label: value })),
        ]}
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            setParams({
              search: undefined,
              role: undefined,
              status: undefined,
              page: undefined,
            })
          }
          className="h-10 shrink-0 rounded-lg px-3 text-sm font-medium text-fg-muted hover:bg-surface hover:text-fg"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
