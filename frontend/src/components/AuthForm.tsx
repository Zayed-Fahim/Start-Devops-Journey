'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useId, useState } from 'react';
import { ApiError, login, registerAccount } from '@/lib/api-browser';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = useId();
  const isRegister = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  let submitLabel = 'Sign in';
  if (submitting) submitLabel = 'Please wait…';
  else if (isRegister) submitLabel = 'Create account';

  const inputClass = (hasError: boolean) =>
    cn(
      'h-10 w-full rounded-lg border bg-bg px-3 text-sm text-fg placeholder:text-fg-muted',
      hasError ? 'border-danger' : 'border-border focus-visible:border-accent',
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      if (isRegister) await registerAccount(name, email, password);
      else await login(email, password);

      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = error.fieldErrors();
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {formError}
        </div>
      )}

      {isRegister && (
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-name`} className="block text-sm font-medium">
            Name
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? `${uid}-name-error` : undefined}
            className={inputClass(Boolean(fieldErrors.name))}
          />
          {fieldErrors.name && (
            <p id={`${uid}-name-error`} className="text-sm text-danger">
              {fieldErrors.name}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-email`} className="block text-sm font-medium">
          Email
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${uid}-email-error` : undefined}
          className={cn(inputClass(Boolean(fieldErrors.email)), 'font-mono')}
        />
        {fieldErrors.email && (
          <p id={`${uid}-email-error`} className="text-sm text-danger">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-password`} className="block text-sm font-medium">
          Password
        </label>
        <input
          id={`${uid}-password`}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? `${uid}-password-error` : `${uid}-password-hint`}
          className={inputClass(Boolean(fieldErrors.password))}
        />
        {fieldErrors.password ? (
          <p id={`${uid}-password-error`} className="text-sm text-danger">
            {fieldErrors.password}
          </p>
        ) : (
          isRegister && (
            <p id={`${uid}-password-hint`} className="text-body-sm text-fg-muted">
              6 to 32 characters, with upper case, lower case and a number.
            </p>
          )
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="h-10 w-full rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {submitLabel}
      </button>

      <p className="text-center text-body-sm text-fg-muted">
        {isRegister ? 'Already have an account? ' : 'No account yet? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-accent hover:underline"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
