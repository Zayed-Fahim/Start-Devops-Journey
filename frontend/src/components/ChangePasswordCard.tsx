'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { changePassword } from '@/lib/api-browser';
import { applyServerErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { PasswordInput } from './PasswordInput';

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
}

export function ChangePasswordCard() {
  const router = useRouter();
  const uid = useId();
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const inputClass = (hasError: boolean) =>
    cn(
      'h-10 w-full rounded-lg border bg-bg px-3 text-sm text-fg placeholder:text-fg-muted',
      hasError ? 'border-danger' : 'border-border focus-visible:border-accent',
    );

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(null);
    try {
      const result = await changePassword(values.currentPassword, values.newPassword);
      reset();
      setSuccess(
        result.revokedSessions > 0
          ? `Password updated. ${result.revokedSessions} other session${
              result.revokedSessions === 1 ? '' : 's'
            } signed out.`
          : 'Password updated.',
      );
      router.refresh();
    } catch (error) {
      applyServerErrors(error, setError, ['currentPassword', 'newPassword']);
    }
  });

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface-raised px-4 py-2">
        <h2 className="text-headline-md">Password</h2>
        <p className="mt-0.5 text-body-sm text-fg-muted">
          Changing your password signs out every other session.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-6" noValidate>
        {errors.root && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {errors.root.message}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
          >
            {success}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-current`} className="block text-sm font-medium">
              Current password
            </label>
            <PasswordInput
              id={`${uid}-current`}
              {...register('currentPassword', { required: 'Your current password is required.' })}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.currentPassword)}
              aria-describedby={errors.currentPassword ? `${uid}-current-error` : undefined}
              className={inputClass(Boolean(errors.currentPassword))}
            />
            {errors.currentPassword && (
              <p id={`${uid}-current-error`} className="text-sm text-danger">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-new`} className="block text-sm font-medium">
              New password
            </label>
            <PasswordInput
              id={`${uid}-new`}
              {...register('newPassword', { required: 'A new password is required.' })}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={errors.newPassword ? `${uid}-new-error` : `${uid}-new-hint`}
              className={inputClass(Boolean(errors.newPassword))}
            />
            {errors.newPassword ? (
              <p id={`${uid}-new-error`} className="text-sm text-danger">
                {errors.newPassword.message}
              </p>
            ) : (
              <p id={`${uid}-new-hint`} className="text-body-sm text-fg-muted">
                6 to 32 characters, with upper case, lower case and a number.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}
