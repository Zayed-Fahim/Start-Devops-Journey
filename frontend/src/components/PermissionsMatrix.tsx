'use client';

import { useRouter } from 'next/navigation';
import { Fragment, startTransition, useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, createRole, deleteRole, updateRole } from '@/lib/api-browser';
import type { PermissionDef, RoleSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

const DRAFT_PREFIX = 'draft-';
const SEED_PERMISSION = 'users.read';

interface LocalRole {
  permissions: string[];
  updatedAt: string | null;
}

interface Overlay {
  local: Map<string, LocalRole>;
  drafts: RoleSummary[];
  hidden: Set<string>;
  busy: Set<string>;
}

function createOverlayStore() {
  let snapshot: Overlay = {
    local: new Map(),
    drafts: [],
    hidden: new Set(),
    busy: new Set(),
  };
  const listeners = new Set<() => void>();
  const chain = new Map<string, Promise<void>>();
  let draftCount = 0;

  const commit = (patch: Partial<Overlay>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read: () => snapshot,
    chainFor: (roleId: string) => chain.get(roleId),
    setChain: (roleId: string, promise: Promise<void> | null) => {
      if (promise) chain.set(roleId, promise);
      else chain.delete(roleId);
    },
    nextDraftId: () => {
      draftCount += 1;
      return `${DRAFT_PREFIX}${draftCount}`;
    },
    setLocal(roleId: string, value: LocalRole | null) {
      const local = new Map(snapshot.local);
      if (value) local.set(roleId, value);
      else local.delete(roleId);
      commit({ local });
    },
    setBusy(roleId: string, value: boolean) {
      const busy = new Set(snapshot.busy);
      if (value) busy.add(roleId);
      else busy.delete(roleId);
      commit({ busy });
    },
    setHidden(roleId: string, value: boolean) {
      const hidden = new Set(snapshot.hidden);
      if (value) hidden.add(roleId);
      else hidden.delete(roleId);
      commit({ hidden });
    },
    setDrafts(drafts: RoleSummary[]) {
      commit({ drafts });
    },
    prune(present: Set<string>, serverUpdatedAt: Map<string, string>) {
      const local = new Map(snapshot.local);
      local.forEach((entry, id) => {
        if (snapshot.busy.has(id)) return;
        const server = serverUpdatedAt.get(id);
        if (server === undefined || entry.updatedAt === null || server >= entry.updatedAt) {
          local.delete(id);
        }
      });

      const drafts = snapshot.drafts.filter((draft) => !present.has(draft.id));
      const hidden = new Set([...snapshot.hidden].filter((id) => present.has(id)));

      if (
        local.size === snapshot.local.size &&
        drafts.length === snapshot.drafts.length &&
        hidden.size === snapshot.hidden.size
      ) {
        return;
      }
      commit({ local, drafts, hidden });
    },
  };
}

type OverlayStore = ReturnType<typeof createOverlayStore>;

function groupPermissions(permissions: PermissionDef[]) {
  const groups = new Map<string, PermissionDef[]>();
  permissions.forEach((permission) => {
    const list = groups.get(permission.group) ?? [];
    list.push(permission);
    groups.set(permission.group, list);
  });
  return [...groups.entries()];
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((entry) => other.has(entry));
}

function byServerOrder(a: RoleSummary, b: RoleSummary) {
  if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function isDraft(role: RoleSummary) {
  return role.id.startsWith(DRAFT_PREFIX);
}

interface RoleValues {
  name: string;
  description: string;
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
  const [store] = useState<OverlayStore>(createOverlayStore);
  const overlay = useSyncExternalStore(store.subscribe, store.read, store.read);

  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const {
    register: registerRole,
    handleSubmit: handleRoleSubmit,
    reset: resetRole,
    setValue: setRoleValue,
    formState: { errors: roleErrors },
  } = useForm<RoleValues>({ defaultValues: { name: '', description: '' } });

  useEffect(() => {
    store.prune(
      new Set(roles.map((role) => role.id)),
      new Map(roles.map((role) => [role.id, role.updatedAt])),
    );
  }, [roles, store]);

  const runQueued = (roleId: string, task: () => Promise<void>) => {
    store.setBusy(roleId, true);

    const previous = store.chainFor(roleId) ?? Promise.resolve();
    const next: Promise<void> = previous
      .then(task)
      .catch((cause) => {
        store.setLocal(roleId, null);
        store.setDrafts(store.read().drafts.filter((draft) => draft.id !== roleId));
        store.setHidden(roleId, false);
        setError(cause instanceof ApiError ? cause.message : 'Could not update roles.');
      })
      .then(() => {
        if (store.chainFor(roleId) !== next) return;
        store.setChain(roleId, null);
        store.setBusy(roleId, false);
        startTransition(() => router.refresh());
      });

    store.setChain(roleId, next);
  };

  const permissionsOf = (role: RoleSummary) =>
    overlay.local.get(role.id)?.permissions ?? role.permissions;

  const isUnsaved = (role: RoleSummary, key: string) => {
    if (!overlay.busy.has(role.id)) return false;
    const local = overlay.local.get(role.id);
    if (!local) return false;
    return local.permissions.includes(key) !== role.permissions.includes(key);
  };

  const visibleRoles = [
    ...roles,
    ...overlay.drafts.filter((draft) => !roles.some((role) => role.id === draft.id)),
  ]
    .filter((role) => !overlay.hidden.has(role.id))
    .sort(byServerOrder);

  const toggle = (role: RoleSummary, key: string) => {
    const current = permissionsOf(role);
    const desired = current.includes(key)
      ? current.filter((entry) => entry !== key)
      : [...current, key];

    store.setLocal(role.id, { permissions: desired, updatedAt: null });
    setError(null);

    runQueued(role.id, async () => {
      const intent = store.read().local.get(role.id);
      if (!intent) return;
      const updated = await updateRole(role.id, { permissions: intent.permissions });
      const settled = store.read().local.get(role.id);
      if (settled && sameSet(settled.permissions, intent.permissions)) {
        store.setLocal(role.id, {
          permissions: updated.permissions,
          updatedAt: updated.updatedAt,
        });
      }
    });
  };

  const removeRole = (role: RoleSummary) => {
    store.setHidden(role.id, true);
    setError(null);
    runQueued(role.id, () => deleteRole(role.id));
  };

  const submitNewRole = handleRoleSubmit((values) => {
    const name = values.name.trim();
    const description = values.description.trim();

    const draftId = store.nextDraftId();
    store.setDrafts([
      ...store.read().drafts,
      {
        id: draftId,
        name,
        description: description || null,
        isSystem: false,
        userCount: 0,
        permissions: [SEED_PERMISSION],
        createdAt: '',
        updatedAt: '',
      },
    ]);

    setError(null);
    setCreating(false);
    resetRole();

    runQueued(draftId, async () => {
      try {
        const created = await createRole({
          name,
          description: description || undefined,
          permissions: [SEED_PERMISSION],
        });
        store.setDrafts([
          ...store.read().drafts.filter((draft) => draft.id !== draftId),
          { ...created, userCount: 0 },
        ]);
      } catch (cause) {
        setCreating(true);
        setRoleValue('name', name);
        setRoleValue('description', description);
        throw cause;
      }
    });
  });

  const grouped = groupPermissions(permissions);
  const savingCount = overlay.busy.size;
  const statusLabel = savingCount
    ? `Saving ${savingCount} change${savingCount === 1 ? '' : 's'}…`
    : '';

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

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-2">
          <h2 className="text-headline-md">Role matrix</h2>
          <span className="text-label-sm text-fg-muted">
            {visibleRoles.length} role{visibleRoles.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Permissions granted to each role</caption>
            <thead className="border-b border-border bg-surface-sunken">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-label-sm uppercase tracking-wider text-fg-muted"
                >
                  Permission
                </th>
                {visibleRoles.map((role) => (
                  <th key={role.id} scope="col" className="px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-fg">{role.name}</div>
                    <div className="mt-0.5 text-xs font-normal text-fg-muted">
                      {isDraft(role) ? (
                        'creating…'
                      ) : (
                        <>
                          {role.userCount} user{role.userCount === 1 ? '' : 's'}
                          {role.isSystem && ' · system'}
                        </>
                      )}
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
                      colSpan={visibleRoles.length + 1}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
                    >
                      {group}
                    </th>
                  </tr>
                  {items.map((permission) => (
                    <tr key={permission.key} className="border-b border-border last:border-b-0">
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <div className="font-medium">{permission.label}</div>
                        <div className="font-mono text-label-sm text-fg-muted">
                          {permission.key}
                        </div>
                      </th>
                      {visibleRoles.map((role) => {
                        const granted = permissionsOf(role).includes(permission.key);
                        const interactive = canManage && !isDraft(role);
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              disabled={!interactive}
                              onClick={() => toggle(role, permission.key)}
                              aria-pressed={granted}
                              aria-label={`${granted ? 'Revoke' : 'Grant'} ${permission.label} for ${role.name}`}
                              className={cn(
                                'grid size-6 place-items-center rounded-md border transition-colors',
                                granted
                                  ? 'border-accent bg-accent text-accent-fg'
                                  : 'border-border text-transparent hover:border-fg-muted',
                                interactive ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                                isUnsaved(role, permission.key) && 'animate-pulse',
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
            <p className="text-body-sm text-fg-muted">
              Custom roles with no users assigned can be deleted.
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleRoles
                .filter((role) => !role.isSystem && role.userCount === 0 && !isDraft(role))
                .map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    disabled={overlay.busy.has(role.id)}
                    onClick={() => removeRole(role)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                  >
                    Delete {role.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className="min-h-4 text-label-sm text-fg-muted">
        {statusLabel}
      </p>

      {canManage && (
        <div className="rounded-lg border border-border bg-surface p-4">
          {creating ? (
            <form onSubmit={submitNewRole} className="flex flex-wrap items-end gap-3" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="new-role-name" className="block text-sm font-medium">
                  Role name
                </label>
                <input
                  id="new-role-name"
                  {...registerRole('name', {
                    required: 'A role name is required.',
                    maxLength: { value: 64, message: 'Name must be 64 characters or fewer.' },
                  })}
                  placeholder="Auditor"
                  aria-invalid={Boolean(roleErrors.name)}
                  aria-describedby={roleErrors.name ? 'new-role-name-error' : undefined}
                  className="h-10 rounded-lg border border-border bg-bg px-3 text-sm focus-visible:border-accent"
                />
                {roleErrors.name && (
                  <p id="new-role-name-error" className="text-label-sm text-danger">
                    {roleErrors.name.message}
                  </p>
                )}
              </div>
              <div className="min-w-48 flex-1 space-y-1.5">
                <label htmlFor="new-role-description" className="block text-sm font-medium">
                  Description
                </label>
                <input
                  id="new-role-description"
                  {...registerRole('description', {
                    maxLength: {
                      value: 255,
                      message: 'Description must be 255 characters or fewer.',
                    },
                  })}
                  placeholder="What is this role for?"
                  aria-invalid={Boolean(roleErrors.description)}
                  aria-describedby={
                    roleErrors.description ? 'new-role-description-error' : undefined
                  }
                  className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm focus-visible:border-accent"
                />
                {roleErrors.description && (
                  <p id="new-role-description-error" className="text-label-sm text-danger">
                    {roleErrors.description.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="h-10 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                Create role
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
          <p className="mt-3 text-label-sm text-fg-muted">
            New roles start with View users. Grant the rest from the grid above.
          </p>
        </div>
      )}
    </div>
  );
}
