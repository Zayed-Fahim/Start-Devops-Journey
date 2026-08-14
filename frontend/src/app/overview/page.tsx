import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { StatCardsView } from '@/components/StatCards';
import { RoleBadge } from '@/components/Badges';
import { ErrorState } from '@/components/ErrorState';
import { IconChevronRight } from '@/components/NavIcons';
import {
  getAuditLogs,
  getAuditStats,
  getSessionUser,
  getTeams,
  getUserStats,
} from '@/lib/api-server';
import type { AuditLog, AuditStats, TeamSummary, UserStats } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Overview · User Management' };

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2">
        <h2 className="text-headline-md">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-label-md text-fg-muted transition-colors hover:text-fg"
    >
      {children}
      <span aria-hidden="true">{IconChevronRight}</span>
    </Link>
  );
}

export default async function OverviewPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  const granted = sessionUser.permissions ?? [];
  if (!granted.includes('users.read')) redirect('/settings');

  let userStats: UserStats | null = null;
  let auditStats: AuditStats | null = null;
  let teams: TeamSummary[] = [];
  let recent: AuditLog[] = [];

  const [statsResult, auditStatsResult, teamsResult, recentResult] = await Promise.allSettled([
    getUserStats(),
    granted.includes('audit.read') ? getAuditStats() : Promise.resolve(null),
    granted.includes('teams.read') ? getTeams() : Promise.resolve({ data: [] as TeamSummary[] }),
    granted.includes('audit.read')
      ? getAuditLogs({ limit: '6' })
      : Promise.resolve({
          data: [] as AuditLog[],
          meta: { page: 1, limit: 0, total: 0, totalPages: 1 },
        }),
  ]);

  if (statsResult.status === 'fulfilled') userStats = statsResult.value;
  if (auditStatsResult.status === 'fulfilled') auditStats = auditStatsResult.value;
  if (teamsResult.status === 'fulfilled') teams = teamsResult.value.data;
  if (recentResult.status === 'fulfilled') recent = recentResult.value.data;

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Overview</h1>
        <p className="mt-1 text-body-md text-fg-muted">
          A snapshot of access across the organization.
        </p>
      </div>

      {!userStats ? (
        <ErrorState title="Could not load the overview" message="The API did not return stats." />
      ) : (
        <StatCardsView stats={userStats} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {userStats && (
          <Panel title="Roles" action={<PanelLink href="/permissions">Permissions</PanelLink>}>
            <ul className="divide-y divide-border">
              {userStats.roles.map((role) => {
                const count = userStats.byRole[role] ?? 0;
                const share = userStats.total ? Math.round((count / userStats.total) * 100) : 0;
                return (
                  <li key={role} className="flex items-center gap-4 px-4 py-3">
                    <RoleBadge role={role} />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-label-sm tabular-nums text-fg-muted">
                      {count} · {share}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        {granted.includes('teams.read') && (
          <Panel title="Teams" action={<PanelLink href="/teams">All teams</PanelLink>}>
            {teams.length === 0 ? (
              <p className="px-4 py-8 text-center text-body-sm text-fg-muted">No teams yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {teams.slice(0, 5).map((team) => (
                  <li key={team.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-medium">{team.name}</span>
                      <span className="block truncate text-label-sm text-fg-muted">
                        {team.lead ? `Lead: ${team.lead.name}` : 'No lead'}
                      </span>
                    </span>
                    <span className="shrink-0 text-label-sm tabular-nums text-fg-muted">
                      {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {granted.includes('audit.read') && (
          <Panel
            title="Recent activity"
            action={<PanelLink href="/audit-logs">Audit log</PanelLink>}
          >
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-body-sm text-fg-muted">
                Nothing recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((entry) => (
                  <li key={entry.id} className="px-4 py-3">
                    <p className="truncate text-body-sm">
                      <span className="font-medium">{entry.actorLabel}</span>{' '}
                      <span className="text-fg-muted">{entry.summary}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-label-sm text-fg-muted">
                      {entry.action} · {formatDate(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {auditStats && (
          <Panel title="Audit volume" action={<PanelLink href="/audit-logs">Audit log</PanelLink>}>
            <dl className="grid grid-cols-2 gap-px bg-border">
              <div className="col-span-2 bg-surface px-4 py-3">
                <dt className="text-label-sm uppercase tracking-wider text-fg-muted">Total</dt>
                <dd className="mt-1 text-headline-md tabular-nums">{auditStats.total}</dd>
              </div>
              {Object.entries(auditStats.byCategory).map(([category, count]) => (
                <div key={category} className="bg-surface px-4 py-3">
                  <dt className="text-label-sm uppercase tracking-wider text-fg-muted">
                    {category}
                  </dt>
                  <dd className="mt-1 text-headline-md tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
