import { getUserStats } from '@/lib/api-server';
import type { UserStats } from '@/lib/types';

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm uppercase tracking-wide text-fg-muted">{label}</p>
        <span className={accent} aria-hidden="true">
          {icon}
        </span>
      </div>

      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
const IconUsers = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
  </svg>
);
const IconCheck = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconShield = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
  </svg>
);
const IconCode = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
    <path d="m9 8-4 4 4 4M15 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export function StatCardsView({ stats }: { stats: UserStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total users" value={stats.total} accent="text-fg-muted" icon={IconUsers} />
      <StatCard
        label="Active"
        value={stats.byStatus.ACTIVE}
        accent="text-emerald-500"
        icon={IconCheck}
      />
      <StatCard
        label="Administrators"
        value={stats.byRole.ADMIN}
        accent="text-violet-500"
        icon={IconShield}
      />
      <StatCard
        label="Developers"
        value={stats.byRole.DEVELOPER}
        accent="text-blue-500"
        icon={IconCode}
      />
    </div>
  );
}
export default async function StatCards() {
  let stats: UserStats | null = null;

  try {
    stats = await getUserStats();
  } catch {
    stats = null;
  }

  if (!stats) return null;

  return <StatCardsView stats={stats} />;
}
