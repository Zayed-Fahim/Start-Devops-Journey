import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TopNav } from '@/components/TopNav';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { SessionsCard } from '@/components/SessionsCard';
import { ErrorState } from '@/components/ErrorState';
import { RoleBadge, StatusBadge } from '@/components/Badges';
import { getSessionUser, getSessions } from '@/lib/api-server';
import type { SessionSummary, User } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Settings · User Management' };

function ProfileCard({ user }: { user: User }) {
  return (
    <section className="rounded-xl border border-border">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          Your account details. Ask an administrator to change your name, role or status.
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">Name</dt>
          <dd className="mt-1 text-sm">{user.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">Email</dt>
          <dd className="mt-1 font-mono text-sm">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">Role</dt>
          <dd className="mt-1">
            <RoleBadge role={user.role} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={user.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fg-muted">Member since</dt>
          <dd className="mt-1 text-sm tabular-nums">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

async function SessionsSection() {
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

  return <SessionsCard sessions={sessions} />;
}

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  return (
    <div className="min-h-screen bg-bg text-fg">
      <TopNav user={sessionUser} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Manage your account security and signed-in devices.
          </p>
        </div>

        <ProfileCard user={sessionUser} />
        <ChangePasswordCard />

        <Suspense fallback={<div className="h-40 rounded-xl border border-border bg-surface/40" />}>
          <SessionsSection />
        </Suspense>
      </main>
    </div>
  );
}
