import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { PreferencesCard } from '@/components/PreferencesCard';
import { SessionsCard } from '@/components/SessionsCard';
import { ErrorState } from '@/components/ErrorState';
import { RoleBadge, StatusBadge } from '@/components/Badges';
import { getSessionUser, getSessions } from '@/lib/api-server';
import type { SessionSummary, SessionUser } from '@/lib/types';
import { formatDate } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Settings · User Management' };

function ProfileCard({ user }: { user: SessionUser }) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface-raised px-4 py-2">
        <h2 className="text-headline-md">Profile</h2>
        <p className="mt-0.5 text-body-sm text-fg-muted">
          Your account details. Ask an administrator to change your name, role or status.
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-label-sm uppercase tracking-wider text-fg-muted">Name</dt>
          <dd className="mt-1 text-sm">{user.name}</dd>
        </div>
        <div>
          <dt className="text-label-sm uppercase tracking-wider text-fg-muted">Email</dt>
          <dd className="mt-1 font-mono text-sm">{user.email}</dd>
        </div>
        <div>
          <dt className="text-label-sm uppercase tracking-wider text-fg-muted">Role</dt>
          <dd className="mt-1">
            <RoleBadge role={user.role} />
          </dd>
        </div>
        <div>
          <dt className="text-label-sm uppercase tracking-wider text-fg-muted">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={user.status} />
          </dd>
        </div>
        <div>
          <dt className="text-label-sm uppercase tracking-wider text-fg-muted">Member since</dt>
          <dd className="mt-1 text-sm tabular-nums">{formatDate(user.createdAt, user)}</dd>
        </div>
      </dl>
    </section>
  );
}

async function SessionsSection({ viewer }: { viewer: SessionUser }) {
  let sessions: SessionSummary[] | null = null;
  let failure: string | null = null;

  try {
    sessions = (await getSessions()).data;
  } catch {
    failure = 'Could not load your active sessions.';
  }

  if (!sessions) {
    return <ErrorState title="Could not load sessions" message={failure ?? 'Unknown error.'} />;
  }

  return <SessionsCard sessions={sessions} viewer={viewer} />;
}

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Settings</h1>
        <p className="mt-1 text-body-md text-fg-muted">
          Manage your account security and signed-in devices.
        </p>
      </div>

      <ProfileCard user={sessionUser} />
      <PreferencesCard user={sessionUser} />

      <ChangePasswordCard />

      <Suspense fallback={<div className="h-40 rounded-lg border border-border bg-surface/40" />}>
        <SessionsSection viewer={sessionUser} />
      </Suspense>
    </AppShell>
  );
}
