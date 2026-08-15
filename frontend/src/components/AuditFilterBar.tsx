'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQueryParams } from '@/lib/useQueryParams';
import { AUDIT_CATEGORIES, AUDIT_RANGES } from '@/lib/types';
import { Select } from './Select';

interface AuditFilterValues {
  search: string;
  category: string;
  range: string;
}

export function AuditFilterBar() {
  const { searchParams, setParams } = useQueryParams();

  const urlSearch = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const range = searchParams.get('range') ?? '30d';

  const { register, control, setValue } = useForm<AuditFilterValues>({
    defaultValues: { search: urlSearch, category, range },
  });

  const search = useWatch({ control, name: 'search' });

  useEffect(() => {
    setValue('search', urlSearch);
  }, [urlSearch, setValue]);

  useEffect(() => {
    setValue('category', category);
  }, [category, setValue]);

  useEffect(() => {
    setValue('range', range);
  }, [range, setValue]);

  useEffect(() => {
    if (search === urlSearch) return undefined;
    const timer = setTimeout(() => setParams({ search, page: undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, urlSearch, setParams]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
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
          {...register('search')}
          placeholder="Filter by user, action, or target…"
          aria-label="Filter audit logs by user, action or target"
          className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent"
        />
      </div>

      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <Select
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              setParams({ category: next, page: undefined });
            }}
            label="Filter by category"
            placeholder="All categories"
            className="sm:w-48"
            options={[
              { value: '', label: 'All categories' },
              ...AUDIT_CATEGORIES.map((value) => ({ value, label: value })),
            ]}
          />
        )}
      />

      <Controller
        control={control}
        name="range"
        render={({ field }) => (
          <Select
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              setParams({ range: next, page: undefined });
            }}
            label="Time range"
            className="sm:w-48"
            options={AUDIT_RANGES.map((option) => ({ value: option.value, label: option.label }))}
          />
        )}
      />

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
