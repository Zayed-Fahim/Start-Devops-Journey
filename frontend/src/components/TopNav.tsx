'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const LINKS: { href: string; label: string; permission?: string }[] = [
  { href: '/', label: 'Users', permission: 'users.read' },
  { href: '/audit-logs', label: 'Audit Logs', permission: 'audit.read' },
  { href: '/teams', label: 'Teams', permission: 'teams.read' },
  { href: '/permissions', label: 'Permissions', permission: 'roles.read' },
  { href: '/settings', label: 'Settings' },
];

export function TopNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const granted = user.permissions ?? [];
  const links = LINKS.filter((link) => !link.permission || granted.includes(link.permission));

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 px-4 py-2 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
        <span className="order-1 font-semibold tracking-tight">AdminPanel</span>

        <nav
          aria-label="Main"
          className="order-3 -mx-4 flex w-full items-center gap-1 overflow-x-auto px-4 pt-2 sm:order-2 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0 sm:pt-0"
        >
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-surface font-medium text-fg sm:bg-transparent sm:after:absolute sm:after:inset-x-3 sm:after:-bottom-[13px] sm:after:h-0.5 sm:after:rounded-full sm:after:bg-accent'
                    : 'text-fg-muted hover:bg-surface hover:text-fg',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
