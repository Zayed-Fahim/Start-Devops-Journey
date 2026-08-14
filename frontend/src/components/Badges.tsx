import type { Role, Status } from '@/lib/types';
import { cn } from '@/lib/utils';

const base =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide whitespace-nowrap';

const ROLE_TONES = [
  {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    accent: 'text-violet-500',
  },
  {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    accent: 'text-blue-500',
  },
  {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    accent: 'text-slate-500',
  },
  {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    accent: 'text-amber-500',
  },
  {
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    accent: 'text-teal-500',
  },
  {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    accent: 'text-rose-500',
  },
  {
    badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    accent: 'text-fuchsia-500',
  },
];

const UNASSIGNED_TONE = {
  badge: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400',
  accent: 'text-fg-muted',
};

const PINNED_TONES: Record<string, number> = { ADMIN: 0, DEVELOPER: 1, USER: 2 };
const PINNED_COUNT = 3;

const hashRole = (role: string) =>
  Array.from(role).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1_000_003, 7);

export function roleTone(role: Role | null) {
  if (!role) return UNASSIGNED_TONE;
  const pinned = PINNED_TONES[role];
  if (pinned !== undefined) return ROLE_TONES[pinned];
  return ROLE_TONES[PINNED_COUNT + (hashRole(role) % (ROLE_TONES.length - PINNED_COUNT))];
}

const STATUS_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  INACTIVE: 'bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
};
const DOT_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-slate-400',
};
export function RoleBadge({ role }: { role: Role | null }) {
  return <span className={cn(base, roleTone(role).badge)}>{role ?? 'Unassigned'}</span>;
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn(base, STATUS_STYLES[status])}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', DOT_STYLES[status])} />
      {status}
    </span>
  );
}
