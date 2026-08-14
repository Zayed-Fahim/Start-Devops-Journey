'use client';

import { useQueryParams } from '@/lib/useQueryParams';
import type { PageMeta } from '@/lib/types';

export function LoadMore({ meta }: { meta: PageMeta }) {
  const { setParams } = useQueryParams();
  const shown = meta.page * meta.limit;

  if (shown >= meta.total) return null;

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setParams({ limit: String(shown + 20) }, { replace: false })}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
      >
        Load more activity
      </button>
    </div>
  );
}
