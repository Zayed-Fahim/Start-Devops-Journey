'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useSyncExternalStore, type ReactNode } from 'react';
import type { NavItem, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  clampWidth,
  readCollapsed,
  readWidth,
  setSidebarCollapsed,
  setSidebarWidth,
  subscribeSidebar,
} from '@/lib/sidebar';
import { CommandPalette } from './CommandPalette';
import { NotificationsButton } from './NotificationsButton';
import { ThemeToggle } from './ThemeToggle';
import { TopSearch } from './TopSearch';
import { UserMenu } from './UserMenu';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCube,
  IconDocs,
  IconHelp,
  IconHistory,
  IconLock,
  IconOverview,
  IconSettings,
  IconTeams,
  IconUsers,
} from './NavIcons';

const ICONS: Record<string, ReactNode> = {
  overview: IconOverview,
  users: IconUsers,
  teams: IconTeams,
  lock: IconLock,
  history: IconHistory,
  settings: IconSettings,
  help: IconHelp,
  docs: IconDocs,
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all',
          active ? 'bg-accent opacity-100' : 'bg-fg opacity-0 group-hover:opacity-40',
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
      <span className="truncate rail:hidden">{item.label}</span>
    </>
  );

  const className = cn(
    'group relative flex items-center gap-2 rounded-lg py-2 pl-4 pr-2 text-label-md transition-colors rail:justify-center rail:px-0',
    active ? 'bg-accent/12 text-fg' : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
  );

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined} className={className}>
      {content}
    </Link>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pb-2 text-label-sm uppercase tracking-wider text-fg-muted/70 rail:hidden">
      {children}
    </p>
  );
}

function NavGroup({ items, isActive }: { items: NavItem[]; isActive: (item: NavItem) => boolean }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.key}>
          <NavLink item={item} active={isActive(item)} />
        </li>
      ))}
    </ul>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const items = user.navigation ?? [];
  const top = items.filter((item) => item.group === 'top');
  const primary = items.filter((item) => item.group === 'primary');
  const secondary = items.filter((item) => item.group === 'secondary');
  const support = items.filter((item) => item.group === 'support');
  const isActive = (item: NavItem) => !item.external && pathname === item.href;
  const current = items.find(isActive);
  const collapsed = useSyncExternalStore(subscribeSidebar, readCollapsed, () => false);
  const handleRef = useRef<HTMLButtonElement>(null);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (collapsed) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = readWidth();
    let next = startWidth;

    document.body.classList.add('sidebar-resizing');
    handleRef.current?.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const candidate = clampWidth(startWidth + (moveEvent.clientX - startX));
      if (candidate === next) return;
      next = candidate;
      document.documentElement.style.setProperty('--sidebar-w', `${next}px`);
    };

    const onUp = () => {
      document.body.classList.remove('sidebar-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setSidebarWidth(next);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const nudge = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setSidebarWidth(readWidth() + (event.key === 'ArrowRight' ? 16 : -16));
  };

  return (
    <div className="flex h-screen bg-bg text-fg">
      <CommandPalette items={items} />

      <div className="relative z-20 hidden w-[var(--sidebar-w)] shrink-0 flex-col border-r border-border bg-gradient-to-b from-surface-raised to-surface transition-[width] duration-200 ease-out md:flex">
        <div className="shrink-0 border-b border-border">
          <div className="flex h-16 items-center gap-2 px-4 rail:justify-center rail:px-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              {IconCube}
            </span>
            <span className="min-w-0 rail:hidden">
              <span className="block truncate text-body-md font-semibold leading-tight">
                Admin Panel
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                <span className="truncate text-label-sm text-fg-muted">Production Cluster</span>
              </span>
            </span>
          </div>
        </div>

        <nav aria-label="Sections" className="flex-1 space-y-6 overflow-y-auto p-2 pt-3">
          {top.length > 0 && <NavGroup items={top} isActive={isActive} />}

          {primary.length > 0 && (
            <div>
              <GroupLabel>Manage</GroupLabel>
              <NavGroup items={primary} isActive={isActive} />
            </div>
          )}

          {secondary.length > 0 && (
            <div>
              <GroupLabel>Account</GroupLabel>
              <NavGroup items={secondary} isActive={isActive} />
            </div>
          )}
        </nav>

        {support.length > 0 && (
          <div className="border-t border-border p-2">
            <NavGroup items={support} isActive={isActive} />
          </div>
        )}

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center gap-2 rounded-lg py-2 pl-4 pr-2 text-label-md text-fg-muted transition-colors hover:bg-fg/5 hover:text-fg rail:justify-center rail:px-0"
          >
            <span className={cn('transition-transform', collapsed && 'rotate-180')}>
              {IconChevronLeft}
            </span>
            <span className="truncate rail:hidden">Collapse</span>
          </button>
        </div>

        <button
          ref={handleRef}
          type="button"
          onPointerDown={startResize}
          onKeyDown={nudge}
          aria-label="Resize sidebar"
          aria-valuenow={collapsed ? undefined : undefined}
          tabIndex={collapsed ? -1 : 0}
          className={cn(
            'absolute inset-y-0 -right-1 z-30 w-2 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-accent/30 focus-visible:bg-accent/50',
            collapsed && 'pointer-events-none opacity-0',
          )}
        />
      </div>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="z-10 flex shrink-0 flex-col border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex h-16 w-full items-center gap-4">
            <span className="flex items-center gap-2 md:hidden">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                {IconCube}
              </span>
              <span className="text-body-md font-semibold">Admin Panel</span>
            </span>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
              <ol className="flex items-center gap-1 text-body-sm">
                <li className="text-fg-muted">Admin Panel</li>
                <li aria-hidden="true" className="text-fg-muted/50">
                  {IconChevronRight}
                </li>
                <li className="truncate font-medium text-fg" aria-current="page">
                  {current?.label ?? 'Overview'}
                </li>
              </ol>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <TopSearch />
              <NotificationsButton />
              <Link
                href="/settings"
                aria-label="Settings"
                className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-sm transition-colors hover:border-border-strong hover:text-fg"
              >
                {IconSettings}
              </Link>
              <ThemeToggle />
              <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
              <UserMenu user={user} />
            </div>
          </div>

          <nav
            aria-label="Sections"
            className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden"
          >
            {items
              .filter((item) => !item.external)
              .map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive(item) ? 'page' : undefined}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-lg px-4 py-1 text-label-md transition-colors',
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

        <main className="flex-1 overflow-y-auto bg-bg p-4 lg:p-6">
          <div className="mx-auto max-w-[1280px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
