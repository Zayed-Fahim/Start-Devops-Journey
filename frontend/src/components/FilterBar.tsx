"use client";

import { useEffect, useState } from "react";
import { useQueryParams } from "@/lib/useQueryParams";
import { ROLES, STATUSES } from "@/lib/types";

const selectClass =
  "h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:border-accent";

export function FilterBar() {
  const { searchParams, setParams } = useQueryParams();

  const urlSearch = searchParams.get("search") ?? "";
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";

  // The input is controlled locally so typing stays instant, and only the
  // committed value goes to the URL after the debounce.
  const [search, setSearch] = useState(urlSearch);

  // Keep the box in sync when the URL changes from somewhere else — the back
  // button, or the "Clear filters" link in the empty state.
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  /**
   * DEBOUNCE, 300 ms.
   *
   * Every keystroke would otherwise be a router navigation, a Server Component
   * re-render and a Postgres query — roughly 9 round trips for "developer".
   * Worse, responses can arrive out of order, so a slow early query can land
   * after a fast later one and repaint the table with stale rows.
   *
   * The cleanup function cancels the pending timer on every new keystroke, so
   * only the last one in a 300 ms window survives.
   */
  useEffect(() => {
    if (search === urlSearch) return; // nothing to commit

    const timer = setTimeout(() => {
      // Reset to page 1: staying on page 3 while narrowing 25 results down to
      // 4 shows an empty table that looks like "no results" but is really
      // "you are past the end".
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
          // A visually hidden <label> rather than placeholder-as-label: the
          // placeholder disappears as soon as the user types, leaving a screen
          // reader with an unlabelled box.
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
        {ROLES.map((value) => (
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

      {/* Rendered only when something is actually filtered, so the control
          never sits there inert inviting a pointless click. */}
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
