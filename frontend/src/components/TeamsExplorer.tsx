'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import {
  ApiError,
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeamMembers,
  removeTeamMember,
  setTeamLead,
} from '@/lib/api-browser';
import type { TeamMember, TeamSummary, User } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { RoleBadge } from './Badges';
import { Select } from './Select';

const inputClass =
  'h-10 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-muted focus-visible:border-accent';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')}
    >
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TeamsExplorer({
  teams,
  users,
  canManage,
}: {
  teams: TeamSummary[];
  users: User[];
  canManage: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const fail = (cause: unknown, fallback: string) => {
    setError(cause instanceof ApiError ? cause.message : fallback);
  };

  const openTeam = async (team: TeamSummary) => {
    if (openId === team.id) {
      setOpenId(null);
      return;
    }
    setOpenId(team.id);
    setError(null);
    if (members[team.id]) return;

    setLoadingId(team.id);
    try {
      const result = await listTeamMembers(team.id);
      setMembers((previous) => ({ ...previous, [team.id]: result.data }));
    } catch (cause) {
      fail(cause, 'Could not load the members of this team.');
      setOpenId(null);
    } finally {
      setLoadingId(null);
    }
  };

  const run = async (key: string, action: () => Promise<unknown>, fallback: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      startTransition(() => router.refresh());
      return true;
    } catch (cause) {
      fail(cause, fallback);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const submitNewTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    const ok = await run(
      'create',
      () => createTeam({ name, description: newDescription.trim() || undefined }),
      'Could not create the team.',
    );
    if (ok) {
      setNewName('');
      setNewDescription('');
      setCreating(false);
    }
  };

  const addMember = async (team: TeamSummary, userId: string) => {
    const ok = await run(
      `${team.id}:add`,
      async () => {
        const member = await addTeamMember(team.id, userId);
        setMembers((previous) => ({
          ...previous,
          [team.id]: [...(previous[team.id] ?? []), member].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        }));
      },
      'Could not add that member.',
    );
    if (ok) setAddingTo(null);
  };

  const dropMember = (team: TeamSummary, member: TeamMember) =>
    run(
      `${team.id}:${member.userId}`,
      async () => {
        await removeTeamMember(team.id, member.userId);
        setMembers((previous) => ({
          ...previous,
          [team.id]: (previous[team.id] ?? []).filter((row) => row.userId !== member.userId),
        }));
      },
      'Could not remove that member.',
    );

  const promote = (team: TeamSummary, member: TeamMember) =>
    run(
      `${team.id}:lead`,
      () => setTeamLead(team.id, team.leadUserId === member.userId ? null : member.userId),
      'Could not change the team lead.',
    );

  const removeTeam = (team: TeamSummary) =>
    run(team.id, () => deleteTeam(team.id), 'Could not delete the team.');

  const memberIdsOf = (teamId: string) => new Set((members[teamId] ?? []).map((m) => m.userId));

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {teams.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-16 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-10 text-fg-muted"
            aria-hidden="true"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
          </svg>
          <h2 className="text-headline-md">No teams yet</h2>
          <p className="max-w-sm text-body-sm text-fg-muted">
            Group people into teams to see at a glance who works on what.
          </p>
        </div>
      )}

      {teams.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-2">
            <h2 className="text-headline-md">All teams</h2>
            <span className="text-label-sm text-fg-muted">
              {teams.length} team{teams.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul>
            {teams.map((team) => {
              const open = openId === team.id;
              const rows = members[team.id] ?? [];
              const taken = memberIdsOf(team.id);
              const available = users.filter((user) => !taken.has(user.id));

              return (
                <li key={team.id} className="border-b border-border last:border-b-0">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openTeam(team)}
                      aria-expanded={open}
                      aria-controls={`${uid}-${team.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Chevron open={open} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{team.name}</span>
                        {team.description && (
                          <span className="block truncate text-label-sm text-fg-muted">
                            {team.description}
                          </span>
                        )}
                      </span>
                    </button>

                    <span className="text-sm tabular-nums text-fg-muted">
                      {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
                    </span>

                    <span className="text-body-sm text-fg-muted">
                      {team.lead ? (
                        <>
                          Lead: <span className="text-fg">{team.lead.name}</span>
                        </>
                      ) : (
                        'No lead'
                      )}
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        disabled={busy === team.id}
                        onClick={() => removeTeam(team)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                      >
                        {busy === team.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>

                  {open && (
                    <div
                      id={`${uid}-${team.id}`}
                      className="border-t border-border bg-surface/40 px-4 py-3"
                    >
                      {loadingId === team.id && (
                        <p className="text-body-sm text-fg-muted">Loading members…</p>
                      )}

                      {loadingId !== team.id && rows.length === 0 && (
                        <p className="text-body-sm text-fg-muted">This team has no members yet.</p>
                      )}

                      {rows.length > 0 && (
                        <ul className="space-y-1">
                          {rows.map((member) => (
                            <li
                              key={member.userId}
                              className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface"
                            >
                              <span
                                aria-hidden="true"
                                className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-fg-muted"
                              >
                                {initials(member.name)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {member.name}
                                  {team.leadUserId === member.userId && (
                                    <span className="ml-2 text-xs font-normal text-fg-muted">
                                      team lead
                                    </span>
                                  )}
                                </span>
                                <span className="block truncate font-mono text-label-sm text-fg-muted">
                                  {member.email}
                                </span>
                              </span>
                              <RoleBadge role={member.role} />
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy === `${team.id}:lead`}
                                    onClick={() => promote(team, member)}
                                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface disabled:opacity-60"
                                  >
                                    {team.leadUserId === member.userId ? 'Clear lead' : 'Make lead'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy === `${team.id}:${member.userId}`}
                                    onClick={() => dropMember(team, member)}
                                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {canManage && (
                        <div className="mt-3">
                          {addingTo === team.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Select
                                id={`${uid}-${team.id}-add`}
                                value=""
                                disabled={busy === `${team.id}:add`}
                                onChange={(userId) => {
                                  if (userId) addMember(team, userId);
                                }}
                                label={`Add a member to ${team.name}`}
                                placeholder="Choose someone…"
                                className="w-56"
                                options={available.map((user) => ({
                                  value: user.id,
                                  label: user.name,
                                }))}
                              />
                              <button
                                type="button"
                                onClick={() => setAddingTo(null)}
                                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingTo(team.id)}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
                            >
                              + Add member
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canManage && (
        <div className="rounded-lg border border-border bg-surface p-4">
          {creating ? (
            <form onSubmit={submitNewTeam} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-name`} className="block text-sm font-medium">
                  Team name
                </label>
                <input
                  id={`${uid}-name`}
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  required
                  maxLength={64}
                  placeholder="Platform"
                  className={inputClass}
                />
              </div>
              <div className="min-w-48 flex-1 space-y-1.5">
                <label htmlFor={`${uid}-description`} className="block text-sm font-medium">
                  Description
                </label>
                <input
                  id={`${uid}-description`}
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  maxLength={255}
                  placeholder="What does this team own?"
                  className={cn(inputClass, 'w-full')}
                />
              </div>
              <button
                type="submit"
                disabled={busy === 'create'}
                className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                {busy === 'create' ? 'Creating…' : 'Create team'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New team
            </button>
          )}
          <p className="mt-3 text-label-sm text-fg-muted">
            A team must be empty before it can be deleted.
          </p>
        </div>
      )}
    </div>
  );
}
