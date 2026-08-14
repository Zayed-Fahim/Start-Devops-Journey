import type { AuditCategory, AuditLog, PageMeta } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

const CATEGORY_STYLES: Record<AuditCategory, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  SECURITY: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function CategoryBadge({ category }: { category: AuditCategory }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide',
        CATEGORY_STYLES[category],
      )}
    >
      {category}
    </span>
  );
}

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-10 text-fg-muted"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="text-headline-md">No activity in this period</h2>
      <p className="max-w-sm text-body-sm text-fg-muted">
        Nothing matches these filters. Try a wider time range, or clear the filters.
      </p>
    </div>
  );
}

export function AuditTimeline({ entries, meta }: { entries: AuditLog[]; meta: PageMeta }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <EmptyTimeline />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <ol className="divide-y divide-border">
        {entries.map((entry) => {
          const at = new Date(entry.createdAt);
          return (
            <li key={entry.id} className="flex items-start gap-4 px-4 py-4 hover:bg-surface/60">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-fg-muted"
              >
                {initials(entry.actorLabel)}
              </span>

              <div className="w-28 shrink-0 font-mono text-xs leading-5 tabular-nums text-fg-muted">
                <div className="text-fg">{timeFormatter.format(at)}</div>
                <time dateTime={entry.createdAt}>{dateFormatter.format(at)}</time>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6">
                  <span className="font-medium text-accent">{entry.actorLabel}</span>{' '}
                  <span className="text-fg">{entry.summary}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-label-sm text-fg-muted">
                  <span className="font-mono">{entry.action}</span>
                  {entry.targetLabel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{entry.targetLabel}</span>
                    </>
                  )}
                  {entry.ip && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{entry.ip}</span>
                    </>
                  )}
                </p>
              </div>

              <CategoryBadge category={entry.category} />
            </li>
          );
        })}
      </ol>

      <div className="border-t border-border px-4 py-3 text-body-sm text-fg-muted tabular-nums">
        Showing <span className="font-medium text-fg">{entries.length}</span> of{' '}
        <span className="font-medium text-fg">{meta.total}</span> events
      </div>
    </div>
  );
}
