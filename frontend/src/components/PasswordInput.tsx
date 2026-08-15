'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

const IconEye = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.7A17 17 0 0 0 2 13s3.6 7 10 7a9.7 9.7 0 0 0 5-1.3" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </svg>
);

export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(className, 'pe-10')}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-fg-muted transition-colors hover:bg-fg/5 hover:text-fg"
      >
        {visible ? IconEyeOff : IconEye}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
