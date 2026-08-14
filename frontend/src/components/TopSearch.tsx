'use client';

import { useSyncExternalStore } from 'react';
import { IconSearch } from './NavIcons';

export const PALETTE_EVENT = 'command-palette:open';

const noopSubscribe = () => () => {};

const readModifier = () =>
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';

export function TopSearch() {
  const modifier = useSyncExternalStore(noopSubscribe, readModifier, () => 'Ctrl');

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(PALETTE_EVENT))}
      className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-left text-body-sm text-fg-muted shadow-sm transition-colors hover:border-border-strong hover:text-fg sm:flex lg:w-72"
    >
      <span aria-hidden="true" className="shrink-0">
        {IconSearch}
      </span>
      <span className="flex-1 truncate">Search…</span>
      <kbd className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-label-sm">
        {modifier}K
      </kbd>
    </button>
  );
}
