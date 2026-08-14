'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { ApiError, createRole, deleteRole, updateRole } from '@/lib/api-browser';
import type { PermissionDef, RoleSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

function groupPermissions(permissions: PermissionDef[]) {
  const groups = new Map<string, PermissionDef[]>();
  permissions.forEach((permission) => {
    const list = groups.get(permission.group) ?? [];
    list.push(permission);
    groups.set(permission.group, list);
  });
  return [...groups.entries()];
}

export function PermissionsMatrix({
  roles,
  permissions,
  canManage,
}: {
  roles: RoleSummary[];
  permissions: PermissionDef[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const grouped = groupPermissions(permissions);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update roles.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const toggle = (role: RoleSummary, key: string) => {
    const next = role.permissions.includes(key)
      ? role.permissions.filter((permission) => permission !== key)
      : [...role.permissions, key];
    return run(`${role.id}:${key}`, () => updateRole(role.id, { permissions: next }));
  };

  const submitNewRole = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await run('create', () =>
      createRole({
        name: newName,
        description: newDescription || undefined,
        permissions: ['users.read'],
      }),
    );
    if (ok) {
      setNewName('');
      setNewDescription('');
      setCreating(false);
    }
  };

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

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Permissions granted to each role</caption>
            <thead className="border-b border-border bg-surface">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-fg-muted"
                >
                  Permission
                </th>
                {roles.map((role) => (
                  <th key={role.id} scope="col" className="px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-fg">{role.name}</div>
                    <div className="mt-0.5 text-xs font-normal text-fg-muted">
                      {role.userCount} user{role.userCount === 1 ? '' : 's'}
                      {role.isSystem && ' · system'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([group, items]) => (
                <Fragment key={group}>
                  <tr className="border-b border-border bg-surface/50">
                    <th
                      scope="colgroup"
                      colSpan={roles.length + 1}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
                    >
                      {group}
                    </th>
                  </tr>
                  {items.map((permission) => (
                    <tr key={permission.key} className="border-b border-border last:border-b-0">
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <div className="font-medium">{permission.label}</div>
                        <div className="font-mono text-xs text-fg-muted">{permission.key}</div>
                      </th>
                      {roles.map((role) => {
                        const granted = role.permissions.includes(permission.key);
                        const key = `${role.id}:${permission.key}`;
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              disabled={!canManage || busy !== null}
                              onClick={() => toggle(role, permission.key)}
                              aria-pressed={granted}
                              aria-label={`${granted ? 'Revoke' : 'Grant'} ${permission.label} for ${role.name}`}
                              className={cn(
                                'grid size-6 place-items-center rounded-md border transition-colors',
                                granted
                                  ? 'border-accent bg-accent text-accent-fg'
                                  : 'border-border text-transparent hover:border-fg-muted',
                                canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                                busy === key && 'opacity-50',
                              )}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                className="size-3.5"
                              >
                                <path
                                  d="M5 13l4 4L19 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-fg-muted">
              Custom roles with no users assigned can be deleted.
            </p>
            <div className="flex flex-wrap gap-2">
              {roles
                .filter((role) => !role.isSystem && role.userCount === 0)
                .map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run(role.id, () => deleteRole(role.id))}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                  >
                    Delete {role.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <div className="rounded-xl border border-border p-4">
          {creating ? (
            <form onSubmit={submitNewRole} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor="new-role-name" className="block text-sm font-medium">
                  Role name
                </label>
                <input
                  id="new-role-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  required
                  maxLength={64}
                  placeholder="Auditor"
                  className="h-10 rounded-lg border border-border bg-bg px-3 text-sm focus-visible:border-accent"
                />
              </div>
              <div className="min-w-48 flex-1 space-y-1.5">
                <label htmlFor="new-role-description" className="block text-sm font-medium">
                  Description
                </label>
                <input
                  id="new-role-description"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  maxLength={255}
                  placeholder="What is this role for?"
                  className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm focus-visible:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={busy !== null}
                className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                {busy === 'create' ? 'Creating…' : 'Create role'}
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
              New role
            </button>
          )}
          <p className="mt-3 text-xs text-fg-muted">
            New roles start with View users. Grant the rest from the grid above.
          </p>
        </div>
      )}
    </div>
  );
}
