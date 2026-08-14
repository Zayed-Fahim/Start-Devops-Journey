'use client';

import { useEffect, useState } from 'react';
import { useQueryParams } from '@/lib/useQueryParams';
import { STATUSES } from '@/lib/types';

const selectClass =
  'h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:border-accent';
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

      <select
        value={role}
        onChange={(event) => setParams({ role: event.target.value, page: undefined })}
        aria-label="Filter by role"
        className={selectClass}
      >
        <option value="">All roles</option>
        {roles.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(event) => setParams({ status: event.target.value, page: undefined })}
        aria-label="Filter by status"
        className={selectClass}
      >
        <option value="">All statuses</option>
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

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
