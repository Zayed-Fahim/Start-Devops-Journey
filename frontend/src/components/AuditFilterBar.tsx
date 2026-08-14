'use client';

import { useEffect, useState } from 'react';
import { useQueryParams } from '@/lib/useQueryParams';
import { AUDIT_CATEGORIES, AUDIT_RANGES } from '@/lib/types';

const controlClass =
  'h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:border-accent';

export function AuditFilterBar() {
  const { searchParams, setParams } = useQueryParams();

  const urlSearch = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const range = searchParams.get('range') ?? '30d';

  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);

  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearch(urlSearch);
  }

  useEffect(() => {
    if (search === urlSearch) return undefined;
    const timer = setTimeout(() => setParams({ search, page: undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, urlSearch, setParams]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center">
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
          placeholder="Filter by user, action, or target…"
          aria-label="Filter audit logs by user, action or target"
          className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent"
        />
      </div>

      <select
        value={category}
        onChange={(event) => setParams({ category: event.target.value, page: undefined })}
        aria-label="Filter by category"
        className={controlClass}
      >
        <option value="">All categories</option>
        {AUDIT_CATEGORIES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        value={range}
        onChange={(event) => setParams({ range: event.target.value, page: undefined })}
        aria-label="Time range"
        className={controlClass}
      >
        {AUDIT_RANGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {(urlSearch || category || range !== '30d') && (
        <button
          type="button"
          onClick={() =>
            setParams({
              search: undefined,
              category: undefined,
              range: undefined,
              page: undefined,
            })
          }
          className="h-10 shrink-0 rounded-lg px-3 text-sm font-medium text-fg-muted hover:bg-bg hover:text-fg"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
