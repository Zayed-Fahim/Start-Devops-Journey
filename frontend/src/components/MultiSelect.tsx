'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { SelectOption } from './Select';

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
    className="size-3 shrink-0"
    aria-hidden="true"
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * Like Select, but the listbox stays open and each option toggles. The caller
 * commits the whole selection at once, so adding five people is one round of
 * decisions and one confirmation rather than five separate writes.
 *
 * The listbox is portalled to <body> for the same reason Select's is: an
 * ancestor with `overflow: hidden` would otherwise crop it.
 */
export function MultiSelect({
  values,
  onChange,
  options,
  label,
  placeholder = 'Select…',
  id,
  disabled = false,
  className,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  id?: string;
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
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const trigger = wrapper.current;
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    setRect({ top: box.bottom + 4, left: box.left, width: box.width });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapper.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    const onViewportChange = () => measure();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, cursor]);

  const toggle = (optionValue: string) => {
    onChange(
      values.includes(optionValue)
        ? values.filter((entry) => entry !== optionValue)
        : [...values, optionValue],
    );
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        setCursor(0);
        setOpen(true);
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
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[cursor];
      if (option) toggle(option.value);
    }
  };

  let triggerLabel = placeholder;
  if (values.length === 1) {
    triggerLabel = options.find((option) => option.value === values[0])?.label ?? placeholder;
  } else if (values.length > 1) {
    triggerLabel = `${values.length} selected`;
  }

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
        onClick={() => (open ? setOpen(false) : setOpen(true))}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-bg px-3 text-left text-body-sm text-fg shadow-sm transition-colors',
          'border-border hover:border-border-strong',
          open && 'border-accent ring-[3px] ring-accent/25',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className={cn('truncate', values.length === 0 && 'text-fg-muted')}>
          {triggerLabel}
        </span>
        <span className={cn('text-fg-muted transition-transform', open && 'rotate-180')}>
          {IconChevron}
        </span>
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            tabIndex={-1}
            style={{ top: rect.top, left: rect.left, minWidth: rect.width }}
            className="fixed z-50 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
          >
            {options.length === 0 && (
              <p className="px-2 py-1.5 text-body-sm text-fg-muted">
                Everyone is already a member.
              </p>
            )}
            {options.map((option, index) => {
              const isSelected = values.includes(option.value);
              const isActive = index === cursor;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm transition-colors',
                    isActive ? 'bg-accent/12 text-fg' : 'text-fg-muted',
                    isSelected && !isActive && 'text-fg',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-4 shrink-0 place-items-center rounded border transition-colors',
                      isSelected
                        ? 'border-accent bg-accent text-accent-fg'
                        : 'border-border-strong bg-bg',
                    )}
                  >
                    {isSelected && IconCheck}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
