'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { AtSignIcon } from 'lucide-react';
import { login, registerAccount } from '@/lib/api-browser';
import { applyServerErrors } from '@/lib/form-errors';
import { PasswordInput } from './PasswordInput';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Mode = 'login' | 'register';

interface AuthValues {
  name: string;
  email: string;
  password: string;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const uid = useId();
  const isRegister = mode === 'register';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<AuthValues>({
    defaultValues: { name: '', email: '', password: '' },
  });

  const pending = isSubmitting || isSubmitSuccessful;

  let submitLabel = isRegister ? 'Create account' : 'Sign in';
  if (pending) submitLabel = 'Please wait…';

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isRegister) await registerAccount(values.name, values.email, values.password);
      else await login(values.email, values.password);

      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (error) {
      applyServerErrors(error, setError, ['name', 'email', 'password']);
    }
  });

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-2" noValidate>
        {errors.root && (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {errors.root.message}
          </div>
        )}

        <p className="text-start text-xs text-fg-muted">
          {isRegister
            ? 'Create an account with your email address'
            : 'Enter your email address to sign in to your account'}
        </p>

        {isRegister && (
          <div>
            <label htmlFor={`${uid}-name`} className="sr-only">
              Name
            </label>
            <Input
              id={`${uid}-name`}
              placeholder="Ada Lovelace"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${uid}-name-error` : undefined}
              {...register('name', {
                required: 'Name is required.',
                maxLength: { value: 120, message: 'Name must be 120 characters or fewer.' },
              })}
            />
            {errors.name && (
              <p id={`${uid}-name-error`} className="mt-1 text-xs text-danger">
                {errors.name.message}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`${uid}-email`} className="sr-only">
            Email
          </label>
          <div className="relative h-max">
            <Input
              id={`${uid}-email`}
              type="email"
              placeholder="your.email@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${uid}-email-error` : undefined}
              className="peer ps-9"
              {...register('email', { required: 'Email is required.' })}
            />
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-fg-muted peer-disabled:opacity-50">
              <AtSignIcon className="size-4" aria-hidden="true" />
            </div>
          </div>
          {errors.email && (
            <p id={`${uid}-email-error`} className="mt-1 text-xs text-danger">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${uid}-password`} className="sr-only">
            Password
          </label>
          <PasswordInput
            id={`${uid}-password`}
            placeholder="Your password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${uid}-password-error` : `${uid}-password-hint`}
            {...register('password', { required: 'Password is required.' })}
          />
          {errors.password ? (
            <p id={`${uid}-password-error`} className="mt-1 text-xs text-danger">
              {errors.password.message}
            </p>
          ) : (
            isRegister && (
              <p id={`${uid}-password-hint`} className="mt-1 text-xs text-fg-muted">
                6 to 32 characters, with upper case, lower case and a number.
              </p>
            )
          )}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          <span>{submitLabel}</span>
        </Button>
      </form>

      <p className="text-sm text-fg-muted">
        {isRegister ? 'Already have an account? ' : 'No account yet? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="font-medium text-accent hover:underline"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </>
  );
}
