'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const LINKS: { href: string; label: string; adminOnly: boolean }[] = [
  { href: '/', label: 'Users', adminOnly: false },
  { href: '/audit-logs', label: 'Audit Logs', adminOnly: true },
  { href: '/settings', label: 'Settings', adminOnly: false },
];

export function TopNav({ user }: { user: User }) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.adminOnly || user.role === 'ADMIN');

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
