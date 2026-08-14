import { getUserStats } from '@/lib/api-server';
import type { UserStats } from '@/lib/types';
import { roleTone } from './Badges';
import { IconBolt, IconCode, IconShield, IconUsers } from './NavIcons';

function StatCard({
  label,
  value,
  detail,
  accent,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-md transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="truncate text-label-sm uppercase tracking-wider text-fg-muted">{label}</p>
          <p className="mt-xs text-display tabular-nums">{value}</p>
        </div>
        <span className={`rounded-md border border-border bg-bg p-xs ${accent}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-sm text-label-sm text-fg-muted">{detail}</p>
    </div>
  );
}

const ROLE_CARDS = 2;
const ROLE_ICONS = [IconShield, IconCode];

export function StatCardsView({ stats }: { stats: UserStats }) {
  const topRoles = stats.roles.slice(0, ROLE_CARDS);
  const share = (count: number) =>
    stats.total === 0
      ? '0% of all users'
      : `${Math.round((count / stats.total) * 100)}% of all users`;

  return (
    <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total users"
        value={stats.total}
        detail={`Across ${stats.roles.length} role${stats.roles.length === 1 ? '' : 's'}`}
        accent="text-accent"
        icon={IconUsers}
      />
      <StatCard
        label="Active"
        value={stats.byStatus.ACTIVE}
        detail={share(stats.byStatus.ACTIVE)}
        accent="text-success"
        icon={IconBolt}
      />
      {topRoles.map((name, index) => (
        <StatCard
          key={name}
          label={name}
          value={stats.byRole[name] ?? 0}
          detail={share(stats.byRole[name] ?? 0)}
          accent={roleTone(name).accent}
          icon={ROLE_ICONS[index] ?? IconShield}
        />
      ))}
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
