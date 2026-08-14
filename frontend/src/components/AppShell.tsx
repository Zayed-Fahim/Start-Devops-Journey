'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { NavItem, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { TopSearch } from './TopSearch';
import { UserMenu } from './UserMenu';
import { IconCube, IconHistory, IconLock, IconSettings, IconTeams, IconUsers } from './NavIcons';

const ICONS: Record<string, ReactNode> = {
  users: IconUsers,
  teams: IconTeams,
  lock: IconLock,
  history: IconHistory,
  settings: IconSettings,
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-sm rounded-lg py-sm pl-md pr-sm text-label-md transition-all',
        active ? 'bg-accent/12 text-fg' : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all',
          active ? 'bg-accent opacity-100' : 'opacity-0 group-hover:opacity-40 group-hover:bg-fg',
        )}
      />
      <span
        className={cn(
          'transition-colors',
          active ? 'text-accent' : 'text-fg-muted group-hover:text-fg',
        )}
      >
        {ICONS[item.icon] ?? ICONS.settings}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-md pb-xs pt-sm text-label-sm uppercase tracking-wider text-fg-muted/70">
      {children}
    </p>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const items = user.navigation ?? [];
  const primary = items.filter((item) => item.group === 'primary');
  const secondary = items.filter((item) => item.group === 'secondary');
  const isActive = (item: NavItem) => pathname === item.href;

  return (
    <div className="flex h-screen bg-bg text-fg">
      <div className="z-20 hidden w-64 shrink-0 flex-col border-r border-border bg-gradient-to-b from-surface-raised to-surface md:flex">
        <div className="border-b border-border/70 p-md">
          <div className="flex items-center gap-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              {IconCube}
            </span>
            <div className="min-w-0">
              <p className="truncate text-body-md font-semibold">Admin Panel</p>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                <span className="truncate text-label-sm text-fg-muted">Production Cluster</span>
              </span>
            </div>
          </div>
        </div>

        <nav aria-label="Sections" className="flex-1 overflow-y-auto p-sm">
          {primary.length > 0 && <GroupLabel>Manage</GroupLabel>}
          <ul className="space-y-0.5">
            {primary.map((item) => (
              <li key={item.key}>
                <NavLink item={item} active={isActive(item)} />
              </li>
            ))}
          </ul>

          {secondary.length > 0 && (
            <>
              <GroupLabel>Account</GroupLabel>
              <ul className="space-y-0.5">
                {secondary.map((item) => (
                  <li key={item.key}>
                    <NavLink item={item} active={isActive(item)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="border-t border-border/70 px-md py-sm">
          <p className="text-label-sm text-fg-muted">
            Signed in as <span className="text-fg">{user.name}</span>
          </p>
          <p className="text-label-sm text-fg-muted/70">{user.role ?? 'No role'}</p>
        </div>
      </div>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="z-10 flex shrink-0 flex-col border-b border-border bg-surface px-md sm:px-lg">
          <div className="flex h-16 w-full items-center gap-md">
            <span className="flex items-center gap-sm md:hidden">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                {IconCube}
              </span>
              <span className="text-body-md font-semibold">Admin Panel</span>
            </span>

            <TopSearch />

            <div className="ml-auto flex items-center gap-sm">
              <ThemeToggle />
              <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
              <UserMenu user={user} />
            </div>
          </div>

          <nav
            aria-label="Sections"
            className="-mx-md flex items-center gap-xs overflow-x-auto px-md pb-sm md:hidden"
          >
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item) ? 'page' : undefined}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-lg px-md py-xs text-label-md transition-colors',
                  isActive(item)
                    ? 'bg-accent/12 text-accent'
                    : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg p-md lg:p-lg">
          <div className="mx-auto max-w-[1280px] space-y-lg">{children}</div>
        </main>
      </div>
    </div>
  );
}
