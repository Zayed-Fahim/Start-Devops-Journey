'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

const IconChevron = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4 shrink-0"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconCheck = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5 shrink-0"
    aria-hidden="true"
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select…',
  id,
  invalid = false,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-listbox`;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, cursor]);

  const openList = () => {
    if (disabled) return;
    setCursor(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setCursor(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setCursor(options.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      commit(cursor);
    }
  };

  return (
    <div ref={wrapper} className={cn('relative', className)}>
      <button
        type="button"
        id={triggerId}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={label}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-bg px-3 text-left text-body-sm text-fg shadow-sm transition-colors',
          invalid ? 'border-danger' : 'border-border hover:border-border-strong',
          open && !invalid && 'border-accent ring-[3px] ring-accent/25',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className={cn('truncate', !selected && 'text-fg-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={cn('text-fg-muted transition-transform', open && 'rotate-180')}>
          {IconChevron}
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-max overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === cursor;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-active={isActive}
                onMouseEnter={() => setCursor(index)}
                onClick={() => commit(index)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm transition-colors',
                  isActive ? 'bg-accent/12 text-fg' : 'text-fg-muted',
                  isSelected && !isActive && 'text-fg',
                )}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected && <span className="text-accent">{IconCheck}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
