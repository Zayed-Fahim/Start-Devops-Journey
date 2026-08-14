export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {['total', 'active', 'admins', 'devs'].map((slot) => (
        <div key={slot} className="rounded-xl border border-border bg-surface p-6">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-3 h-8 w-14" />
        </div>
      ))}
    </div>
  );
}
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      role="status"
      aria-label="Loading users"
    >
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="skeleton h-3 w-32" />
      </div>
      <div aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => `skeleton-row-${i}`).map((rowKey) => (
          <div
            key={rowKey}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="skeleton size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3 w-40 max-w-full" />
              <div className="skeleton h-2.5 w-56 max-w-full" />
            </div>
            <div className="skeleton hidden h-5 w-20 rounded-full sm:block" />
            <div className="skeleton hidden h-5 w-16 rounded-full sm:block" />
            <div className="skeleton hidden h-3 w-20 md:block" />
            <div className="skeleton size-8 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
