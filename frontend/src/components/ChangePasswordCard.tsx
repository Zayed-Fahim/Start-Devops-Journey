'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { ApiError, changePassword } from '@/lib/api-browser';
import { cn } from '@/lib/utils';

export function ChangePasswordCard() {
  const router = useRouter();
  const uid = useId();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setSuccess(null);

    try {
      const result = await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess(
        result.revokedSessions > 0
          ? `Password updated. ${result.revokedSessions} other session${
              result.revokedSessions === 1 ? '' : 's'
            } signed out.`
          : 'Password updated.',
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = error.fieldErrors();
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-border">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">Password</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          Changing your password signs out every other session.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {formError}
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
            <input
              id={`${uid}-current`}
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.currentPassword)}
              aria-describedby={fieldErrors.currentPassword ? `${uid}-current-error` : undefined}
              className={inputClass(Boolean(fieldErrors.currentPassword))}
            />
            {fieldErrors.currentPassword && (
              <p id={`${uid}-current-error`} className="text-sm text-danger">
                {fieldErrors.currentPassword}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-new`} className="block text-sm font-medium">
              New password
            </label>
            <input
              id={`${uid}-new`}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.newPassword)}
              aria-describedby={fieldErrors.newPassword ? `${uid}-new-error` : `${uid}-new-hint`}
              className={inputClass(Boolean(fieldErrors.newPassword))}
            />
            {fieldErrors.newPassword ? (
              <p id={`${uid}-new-error`} className="text-sm text-danger">
                {fieldErrors.newPassword}
              </p>
            ) : (
              <p id={`${uid}-new-hint`} className="text-sm text-fg-muted">
                6 to 32 characters, with upper case, lower case and a number.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}
