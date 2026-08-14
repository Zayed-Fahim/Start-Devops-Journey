import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { TeamsExplorer } from '@/components/TeamsExplorer';
import { ErrorState } from '@/components/ErrorState';
import { getSessionUser, getTeams, getUsers } from '@/lib/api-server';
import type { TeamSummary, User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Teams · User Management' };

export default async function TeamsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  const granted = sessionUser.permissions ?? [];
  if (!granted.includes('teams.read')) redirect('/');

  let teams: TeamSummary[] | null = null;
  let users: User[] = [];
  let failure: string | null = null;

  try {
    const [teamResult, userResult] = await Promise.all([
      getTeams(),
      granted.includes('users.read')
        ? getUsers({ limit: '100' })
        : Promise.resolve({ data: [] as User[] }),
    ]);
    teams = teamResult.data;
    users = userResult.data;
  } catch {
    failure = 'Could not load teams.';
  }

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Teams</h1>
        <p className="mt-1 text-body-md text-fg-muted">
          Group people into teams and name who leads each one.
        </p>
      </div>

      {!teams ? (
        <ErrorState title="Could not load teams" message={failure ?? 'Unknown error.'} />
      ) : (
        <TeamsExplorer teams={teams} users={users} canManage={granted.includes('teams.manage')} />
      )}
    </AppShell>
  );
}
