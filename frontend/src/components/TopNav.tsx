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
  { href: '/permissions', label: 'Permissions', permission: 'roles.read' },
  { href: '/settings', label: 'Settings' },
];

export function TopNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const granted = user.permissions ?? [];
  const links = LINKS.filter((link) => !link.permission || granted.includes(link.permission));

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <span className="font-semibold tracking-tight">AdminPanel</span>

        <nav aria-label="Main" className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'font-medium text-fg after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent'
                    : 'text-fg-muted hover:bg-surface hover:text-fg',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
