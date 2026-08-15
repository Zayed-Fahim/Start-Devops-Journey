import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Layout and typography only. The border, background, radius, shadow and focus
 * ring come from the unlayered `input` rules in globals.css, which beat every
 * Tailwind utility regardless of specificity — restating them here would be
 * dead weight that silently loses.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full px-3 py-2 text-sm placeholder:text-fg-muted file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg disabled:cursor-not-allowed',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
