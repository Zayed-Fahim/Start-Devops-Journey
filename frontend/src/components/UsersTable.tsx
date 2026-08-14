'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryParams } from '@/lib/useQueryParams';
import type { SortableColumn, User, UsersResponse } from '@/lib/types';
import { cn, formatDate, initials } from '@/lib/utils';
import { RoleBadge, StatusBadge } from './Badges';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import { UserFormModal } from './UserFormModal';
import { ConfirmDialog } from './ConfirmDialog';

const COLUMNS: {
  key: SortableColumn;
  label: string;
  className?: string;
}[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email', className: 'hidden md:table-cell' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status', className: 'hidden sm:table-cell' },
  { key: 'createdAt', label: 'Created', className: 'hidden lg:table-cell' },
];
const MENU_GAP = 4;

function sortDirection(isActive: boolean, order: string): 'ascending' | 'descending' | 'none' {
  if (!isActive) return 'none';
  return order === 'asc' ? 'ascending' : 'descending';
}

function sortGlyph(isActive: boolean, order: string): string {
  if (!isActive) return '↕';
  return order === 'asc' ? '↑' : '↓';
}

function SortableHeader({
  column,
  label,
  activeSort,
  activeOrder,
  onSort,
}: {
  column: SortableColumn;
  label: string;
  activeSort: string;
  activeOrder: string;
  onSort: (column: SortableColumn) => void;
}) {
  const isActive = activeSort === column;
  const direction = sortDirection(isActive, activeOrder);
  return (
    <th scope="col" aria-sort={direction} className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-fg-muted hover:text-fg"
      >
        {label}
        <span
          aria-hidden="true"
          className={cn(
            'transition-opacity',
            isActive ? 'opacity-100' : 'opacity-30 group-hover:opacity-60',
          )}
        >
          {sortGlyph(isActive, activeOrder)}
        </span>
      </button>
    </th>
  );
}
function RowActions({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const { clientWidth: viewportWidth, clientHeight: viewportHeight } = document.documentElement;
    const flipUp =
      menuHeight > 0 &&
      rect.bottom + MENU_GAP + menuHeight > viewportHeight &&
      rect.top - MENU_GAP - menuHeight > 0;
    const preferredTop = flipUp ? rect.top - MENU_GAP - menuHeight : rect.bottom + MENU_GAP;
    const maxTop = viewportHeight - menuHeight - MENU_GAP;
    const top = menuHeight > 0 ? Math.max(MENU_GAP, Math.min(preferredTop, maxTop)) : preferredTop;
    const right = viewportWidth - rect.right;
    setPosition((current) =>
      current && current.top === top && current.right === right ? current : { top, right },
    );
  }, []);
  const attachMenu = useCallback(
    (node: HTMLDivElement | null) => {
      menuRef.current = node;
      if (node) updatePosition();
    },
    [updatePosition],
  );
  const toggle = () => {
    if (!open) updatePosition();
    setOpen((value) => !value);
  };
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);
  const itemClass =
    'block w-full px-3 py-2 text-left text-sm hover:bg-surface focus-visible:bg-surface';
  const runAction = (action: (user: User) => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    action(user);
  };
  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${user.name}`}
        className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface hover:text-fg"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={attachMenu}
            role="menu"
            aria-label={`Actions for ${user.name}`}
            style={{ top: position.top, right: position.right }}
            className="fixed z-50 w-36 overflow-hidden rounded-lg border border-border bg-bg py-1 shadow-lg"
          >
            <button
              role="menuitem"
              type="button"
              onClick={() => runAction(onEdit)}
              className={itemClass}
            >
              Edit
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => runAction(onDelete)}
              className={cn(itemClass, 'text-danger')}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
export function UsersTable({
  users,
  meta,
  isFiltered,
  canManage,
  roles,
}: {
  users: UsersResponse['data'];
  meta: UsersResponse['meta'];
  isFiltered: boolean;
  canManage: boolean;
  roles: string[];
}) {
  const { searchParams, setParams } = useQueryParams();
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const activeSort = searchParams.get('sortBy') ?? 'createdAt';
  const activeOrder = searchParams.get('order') ?? 'desc';
  const handleSort = (column: SortableColumn) => {
    const nextOrder = activeSort === column && activeOrder === 'asc' ? 'desc' : 'asc';
    setParams({ sortBy: column, order: nextOrder, page: undefined });
  };
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border">
        <EmptyState filtered={isFiltered} />
      </div>
    );
  }
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Users, sorted by {activeSort} {activeOrder === 'asc' ? 'ascending' : 'descending'}
            </caption>
            <thead className="border-b border-border bg-surface">
              <tr>
                {COLUMNS.map((column) => (
                  <SortableHeader
                    key={column.key}
                    column={column.key}
                    label={column.label}
                    activeSort={activeSort}
                    activeOrder={activeOrder}
                    onSort={handleSort}
                  />
                ))}
                {canManage && (
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-fg-muted"
                      >
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>

                        <p className="truncate font-mono text-xs text-fg-muted md:hidden">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-fg-muted md:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums text-fg-muted lg:table-cell">
                    <time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <RowActions user={user} onEdit={setEditing} onDelete={setDeleting} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} />
      </div>

      {editing && (
        <UserFormModal
          key={editing.id}
          open
          roles={roles}
          onClose={() => setEditing(null)}
          user={editing}
        />
      )}
      <ConfirmDialog user={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
