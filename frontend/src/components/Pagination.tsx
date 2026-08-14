'use client';

import { useQueryParams } from '@/lib/useQueryParams';
import type { PageMeta } from '@/lib/types';
import { cn } from '@/lib/utils';

type PageSlot = { key: string; page: number | null };

function pageWindow(current: number, total: number): PageSlot[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({ key: `page-${i + 1}`, page: i + 1 }));
  }

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);

  return sorted.flatMap((value, index) => {
    const slot: PageSlot = { key: `page-${value}`, page: value };
    if (index > 0 && value - sorted[index - 1] > 1) {
      return [{ key: `gap-${value}`, page: null }, slot];
    }
    return [slot];
  });
}
export function Pagination({ meta }: { meta: PageMeta }) {
  const { setParams } = useQueryParams();
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const goTo = (next: number) =>
    setParams({ page: next === 1 ? undefined : String(next) }, { replace: false });
  const arrowClass =
    'grid size-8 place-items-center rounded-lg border border-border text-fg-muted enabled:hover:bg-surface enabled:hover:text-fg disabled:opacity-40';
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-sm text-fg-muted tabular-nums" aria-live="polite">
        Showing <span className="font-medium text-fg">{from}</span>–
        <span className="font-medium text-fg">{to}</span> of{' '}
        <span className="font-medium text-fg">{total}</span> users
      </p>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={arrowClass}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
              aria-hidden="true"
            >
              <path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {pageWindow(page, totalPages).map((slot) =>
            slot.page === null ? (
              <span key={slot.key} className="px-1 text-fg-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={slot.key}
                type="button"
                onClick={() => goTo(slot.page as number)}
                aria-current={slot.page === page ? 'page' : undefined}
                aria-label={`Page ${slot.page}`}
                className={cn(
                  'grid size-8 place-items-center rounded-lg border text-sm tabular-nums',
                  slot.page === page
                    ? 'border-accent bg-accent text-accent-fg font-medium'
                    : 'border-border text-fg-muted hover:bg-surface hover:text-fg',
                )}
              >
                {slot.page}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={arrowClass}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
              aria-hidden="true"
            >
              <path d="m10 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  );
}
