'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NavItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  IconDocs,
  IconHelp,
  IconHistory,
  IconLock,
  IconOverview,
  IconSearch,
  IconSettings,
  IconTeams,
  IconUsers,
} from './NavIcons';
import { PALETTE_EVENT } from './TopSearch';

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

interface Command {
  id: string;
  label: string;
  hint: string;
  group: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setTerm('');
    setCursor(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onExternalOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(PALETTE_EVENT, onExternalOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(PALETTE_EVENT, onExternalOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const query = term.trim();
    const matches = (label: string) => label.toLowerCase().includes(query.toLowerCase());

    const sections = items
      .filter((item) => matches(item.label))
      .map((item) => ({
        id: item.key,
        label: item.label,
        hint: item.external ? 'External' : 'Jump to',
        group: item.external ? 'Resources' : 'Navigation',
        icon: ICONS[item.icon] ?? ICONS.settings,
        run: () => {
          if (item.external) window.open(item.href, '_blank', 'noopener,noreferrer');
          else router.push(item.href);
        },
      }));

    if (!query) return sections;

    return [
      {
        id: 'search-users',
        label: `Search users for “${query}”`,
        hint: 'Search',
        group: 'Search',
        icon: IconSearch,
        run: () => router.push(`/?search=${encodeURIComponent(query)}`),
      },
      ...sections,
    ];
  }, [items, term, router]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { command: Command; index: number }[]>();
    commands.forEach((command, index) => {
      if (!map.has(command.group)) {
        map.set(command.group, []);
        order.push(command.group);
      }
      map.get(command.group)?.push({ command, index });
    });
    return order.map((group) => ({ group, entries: map.get(group) ?? [] }));
  }, [commands]);

  if (!open) return null;

  const activate = (command: Command | undefined) => {
    if (!command) return;
    close();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((value) => (commands.length ? (value + 1) % commands.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((value) => (commands.length ? (value - 1 + commands.length) % commands.length : 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      activate(commands[cursor]);
    }
  };

  const chip = 'rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-label-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={close}
        className="overlay-enter absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="palette-enter relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface-raised shadow-2xl ring-1 ring-accent/10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
        />

        <div className="border-b border-border bg-surface-sunken/60 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 shadow-sm transition-colors focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/25">
            <span aria-hidden="true" className="shrink-0 text-fg-muted">
              {IconSearch}
            </span>
            <input
              ref={inputRef}
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search sections or users…"
              aria-label="Search sections or users"
              className="bare h-11 flex-1 text-body-md text-fg outline-none placeholder:text-fg-muted"
            />
            {term ? (
              <button
                type="button"
                onClick={() => {
                  setTerm('');
                  setCursor(0);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-fg/10 hover:text-fg"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <kbd className={cn(chip, 'shrink-0 text-fg-muted')}>esc</kbd>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {commands.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <span className="text-fg-muted/60">{IconSearch}</span>
              <p className="text-body-sm text-fg-muted">No matches for “{term.trim()}”.</p>
            </div>
          )}

          {grouped.map(({ group, entries }) => (
            <div key={group} className="mb-1 last:mb-0">
              <p className="px-2 pb-1 pt-2 text-label-sm uppercase tracking-wider text-fg-muted/70">
                {group}
              </p>
              {entries.map(({ command, index }) => {
                const active = index === cursor;
                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => activate(command)}
                    onMouseEnter={() => setCursor(index)}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors',
                      active ? 'bg-accent/12 text-fg' : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className={cn('shrink-0', active ? 'text-accent' : 'text-fg-muted')}>
                      {command.icon}
                    </span>
                    <span className="flex-1 truncate text-body-sm">{command.label}</span>
                    <span className="shrink-0 text-label-sm text-fg-muted">{command.hint}</span>
                    {active && <kbd className={cn(chip, 'hidden text-fg-muted sm:inline')}>↵</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-surface px-4 py-2 text-label-sm text-fg-muted">
          <span className="flex items-center gap-1">
            <kbd className={chip}>↑</kbd>
            <kbd className={chip}>↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className={chip}>↵</kbd>
            open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className={chip}>esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
