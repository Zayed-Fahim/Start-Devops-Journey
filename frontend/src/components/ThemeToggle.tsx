'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

type Preference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

const listeners = new Set<() => void>();

const notifyPreference = () => {
  listeners.forEach((listener) => listener());
};

const subscribePreference = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

const readPreference = (): Preference => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    return 'system';
  }
  return 'system';
};

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyPreference = (preference: Preference) => {
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
};

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

const isDarkNow = () => document.documentElement.classList.contains('dark');

const IconSun = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
    <circle cx="12" cy="12" r="4" />
    <path
      d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
      strokeLinecap="round"
    />
  </svg>
);

const IconMoon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
    <path
      d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSystem = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" strokeLinecap="round" />
  </svg>
);

const OPTIONS: { value: Preference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  { value: 'system', label: 'System', icon: IconSystem },
];

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);
  const preference = useSyncExternalStore(subscribePreference, readPreference, () => 'system');
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preference !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => applyPreference('system');
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

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

  const choose = (value: Preference) => {
    applyPreference(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      notifyPreference();
    }
    notifyPreference();
    setOpen(false);
  };

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${preference}. Change theme`}
        className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-sm transition-colors hover:border-border-strong hover:text-fg"
      >
        {dark ? IconMoon : IconSun}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={preference === option.value}
              onClick={() => choose(option.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm transition-colors',
                preference === option.value
                  ? 'bg-accent/12 text-fg'
                  : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
              )}
            >
              <span className={preference === option.value ? 'text-accent' : ''}>
                {option.icon}
              </span>
              {option.label}
              {preference === option.value && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="ml-auto size-3.5 text-accent"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
