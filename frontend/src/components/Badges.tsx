import type { Role, Status } from '@/lib/types';
import { cn } from '@/lib/utils';

const base =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide whitespace-nowrap';
const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  DEVELOPER: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  USER: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
};
const STATUS_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  INACTIVE: 'bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
};
const DOT_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-slate-400',
};
export function RoleBadge({ role }: { role: Role }) {
  return <span className={cn(base, ROLE_STYLES[role])}>{role}</span>;
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn(base, STATUS_STYLES[status])}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT_STYLES[status])} />
      {status}
    </span>
  );
}
