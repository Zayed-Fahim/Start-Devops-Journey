'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
  type AppNotification,
} from '@/lib/api-browser';
import { formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { IconBell } from './NavIcons';

const PAGE_SIZE = 10;
const POLL_MS = 30000;
const PERMISSION_KEY = 'notifications:desktop';

const desktopListeners = new Set<() => void>();

const subscribeDesktop = (listener: () => void) => {
  desktopListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    desktopListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

const readDesktop = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    return Notification.permission === 'granted' && localStorage.getItem(PERMISSION_KEY) === 'on';
  } catch {
    return false;
  }
};

const notifyDesktopChange = () => {
  desktopListeners.forEach((listener) => listener());
};

const CATEGORY_TONE: Record<string, string> = {
  CREATE: 'bg-success',
  UPDATE: 'bg-accent',
  DELETE: 'bg-danger',
  SECURITY: 'bg-warn',
};

export function NotificationsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const desktop = useSyncExternalStore(subscribeDesktop, readDesktop, () => false);
  const wrapper = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const announce = useCallback(
    (incoming: AppNotification[]) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (localStorage.getItem(PERMISSION_KEY) !== 'on') return;

      incoming
        .filter((item) => item.readAt === null && !seen.current.has(item.id))
        .slice(0, 3)
        .forEach((item) => {
          seen.current.add(item.id);
          const shown = new Notification(item.title, {
            body: item.body ?? undefined,
            tag: item.id,
          });
          shown.onclick = () => {
            window.focus();
            if (item.href) router.push(item.href);
          };
        });
    },
    [router],
  );

  const load = useCallback(
    async (nextPage: number, { append = false } = {}) => {
      setLoading(true);
      try {
        const result = await listNotifications(nextPage, PAGE_SIZE);
        setItems((previous) => (append ? [...previous, ...result.data] : result.data));
        setUnread(result.meta.unread);
        setHasMore(result.meta.hasMore);
        setPage(nextPage);
        if (!primed.current) {
          result.data.forEach((item) => seen.current.add(item.id));
          primed.current = true;
        } else if (!append) {
          announce(result.data);
        }
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [announce],
  );

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const result = await unreadNotificationCount();
        if (cancelled) return;
        setUnread((previous) => {
          if (result.unread > previous) load(1);
          return result.unread;
        });
      } catch {
        // a failed poll is not worth surfacing
      }
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) load(1);
  };

  const openItem = async (item: AppNotification) => {
    if (item.readAt === null) {
      setItems((previous) =>
        previous.map((row) =>
          row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
        ),
      );
      setUnread((previous) => Math.max(0, previous - 1));
      try {
        const result = await markNotificationRead(item.id);
        setUnread(result.unread);
      } catch {
        load(1);
      }
    }
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
  };

  const readAll = async () => {
    const stamp = new Date().toISOString();
    setItems((previous) => previous.map((row) => ({ ...row, readAt: row.readAt ?? stamp })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      load(1);
    }
  };

  const enableDesktop = async () => {
    if (!('Notification' in window)) return;
    const permission =
      Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    localStorage.setItem(PERMISSION_KEY, permission === 'granted' ? 'on' : 'off');
    notifyDesktopChange();
  };

  const disableDesktop = () => {
    localStorage.setItem(PERMISSION_KEY, 'off');
    notifyDesktopChange();
  };

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid size-9 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-sm transition-colors hover:border-border-strong hover:text-fg"
      >
        {IconBell}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-fg">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-label-md">
              Notifications
              {unread > 0 && <span className="ml-1 text-fg-muted">({unread} unread)</span>}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="rounded-md px-2 py-1 text-label-sm text-fg-muted transition-colors hover:bg-fg/5 hover:text-fg"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && !loading && (
              <p className="px-3 py-8 text-center text-body-sm text-fg-muted">
                Nothing yet. Account and role changes will show up here.
              </p>
            )}

            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-fg/5',
                  item.readAt === null && 'bg-accent/5',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    item.readAt === null
                      ? (CATEGORY_TONE[item.category] ?? 'bg-accent')
                      : 'bg-transparent',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-body-sm',
                      item.readAt === null ? 'font-medium text-fg' : 'text-fg-muted',
                    )}
                  >
                    {item.title}
                  </span>
                  {item.body && (
                    <span className="mt-0.5 block line-clamp-2 text-label-sm text-fg-muted">
                      {item.body}
                    </span>
                  )}
                  <span className="mt-1 block text-label-sm text-fg-muted/70">
                    {formatRelative(item.createdAt)}
                  </span>
                </span>
              </button>
            ))}

            {hasMore && (
              <button
                type="button"
                disabled={loading}
                onClick={() => load(page + 1, { append: true })}
                className="w-full px-3 py-2.5 text-center text-label-md text-accent transition-colors hover:bg-fg/5 disabled:opacity-60"
              >
                {loading ? 'Loading…' : `Load ${PAGE_SIZE} more`}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
            <span className="text-label-sm text-fg-muted">Desktop alerts</span>
            <button
              type="button"
              onClick={desktop ? disableDesktop : enableDesktop}
              className={cn(
                'rounded-md border px-2 py-1 text-label-sm transition-colors',
                desktop
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              {desktop ? 'On' : 'Enable'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
