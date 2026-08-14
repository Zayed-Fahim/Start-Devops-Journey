import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const IconDashboard = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[18px]"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

export const IconBack = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[18px]"
    aria-hidden="true"
  >
    <path d="M19 12H5" strokeLinecap="round" />
    <path d="m11 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconRetry = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[18px]"
    aria-hidden="true"
  >
    <path d="M20 12a8 8 0 1 1-2.34-5.66" strokeLinecap="round" />
    <path d="M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const actionClass =
  'flex w-full items-center justify-center gap-2 rounded px-6 py-3 text-xs font-medium transition-all active:scale-[0.98] sm:w-auto';

export const primaryActionClass = cn(actionClass, 'bg-accent text-accent-fg hover:opacity-90');

export const secondaryActionClass = cn(
  actionClass,
  'border border-border bg-transparent text-fg hover:bg-surface',
);

export function ErrorScreen({
  code,
  title,
  description,
  meta,
  actions,
  decorated = false,
}: {
  code: string;
  title: string;
  description: string;
  meta: string[];
  actions: ReactNode;
  decorated?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-6 text-fg">
      {decorated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]"
        >
          <div className="size-[800px] animate-[spin_120s_linear_infinite] rounded-full border border-fg-muted mix-blend-screen" />
          <div className="absolute size-[600px] animate-[spin_90s_linear_infinite_reverse] rounded-full border border-fg-muted mix-blend-screen" />
        </div>
      )}

      <div className="flex w-full max-w-[1440px] flex-col items-center px-4 text-center md:px-6">
        <div className="mb-4">
          <h1 className="select-none font-mono text-[120px] font-bold leading-none tracking-tighter text-fg opacity-10 md:text-[180px]">
            {code}
          </h1>
        </div>

        <div className="mb-8 flex max-w-md flex-col items-center gap-2">
          <h2 className="text-2xl font-semibold leading-8">{title}</h2>
          <p className="text-base leading-6 text-fg-muted">{description}</p>
        </div>

        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          {actions}
        </div>

        <div className="mt-8 flex w-full max-w-sm flex-wrap justify-center gap-4 border-t border-border pt-6 text-fg-muted">
          {meta.map((entry) => (
            <span key={entry} className="font-mono text-xs">
              {entry}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
