'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, createSupportRequest, setSupportRequestStatus } from '@/lib/api-browser';
import { formatDateTime } from '@/lib/datetime';
import { applyServerErrors } from '@/lib/form-errors';
import type { SessionUser, SupportRequest, SupportRequestsResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RequestValues {
  subject: string;
  body: string;
}

function StatusPill({ status }: { status: SupportRequest['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-sm uppercase tracking-wide',
        status === 'OPEN' ? 'bg-warn-soft/20 text-warn' : 'bg-success/15 text-success',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', status === 'OPEN' ? 'bg-warn' : 'bg-success')}
      />
      {status}
    </span>
  );
}

export function SupportRequests({
  requests,
  viewer,
}: {
  requests: SupportRequestsResponse;
  viewer: SessionUser;
}) {
  const router = useRouter();
  const uid = useId();
  const { manages } = requests.meta;
  const [busy, setBusy] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({ defaultValues: { subject: '', body: '' } });

  const submit = handleSubmit(async (values) => {
    setSent(false);
    try {
      await createSupportRequest({ subject: values.subject.trim(), body: values.body.trim() });
      reset();
      setSent(true);
      startTransition(() => router.refresh());
    } catch (error) {
      applyServerErrors(error, setError, ['subject', 'body']);
    }
  });

  const toggleStatus = async (request: SupportRequest) => {
    setBusy(request.id);
    setListError(null);
    try {
      await setSupportRequestStatus(request.id, request.status === 'OPEN' ? 'CLOSED' : 'OPEN');
      startTransition(() => router.refresh());
    } catch (cause) {
      setListError(cause instanceof ApiError ? cause.message : 'Could not update the request.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Managers answer this queue; they do not file into it. Raising a request
          notifies whoever holds support.manage — for that person it would be a
          notification addressed to themselves. */}
      {!manages && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border bg-surface-raised px-4 py-2">
            <h2 className="text-headline-md">Raise a request</h2>
            <p className="text-label-sm text-fg-muted">
              Tell us what you were doing and what you expected to happen.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 p-4" noValidate>
            {errors.root && (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-body-sm text-danger"
              >
                {errors.root.message}
              </div>
            )}
            {sent && !errors.root && (
              <div
                role="status"
                className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-body-sm text-success"
              >
                Sent. An administrator has been notified.
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={`${uid}-subject`} className="block text-label-md">
                Subject
              </label>
              <input
                id={`${uid}-subject`}
                {...register('subject', {
                  required: 'A subject is required.',
                  minLength: { value: 4, message: 'Subject must be at least 4 characters.' },
                  maxLength: { value: 160, message: 'Subject must be 160 characters or fewer.' },
                })}
                placeholder="Cannot open the audit log"
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? `${uid}-subject-error` : undefined}
                className="h-10 w-full rounded-lg px-3 text-body-sm"
              />
              {errors.subject && (
                <p id={`${uid}-subject-error`} className="text-label-sm text-danger">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${uid}-body`} className="block text-label-md">
                What happened
              </label>
              <textarea
                id={`${uid}-body`}
                {...register('body', {
                  required: 'Please describe what happened.',
                  minLength: { value: 10, message: 'Please use at least 10 characters.' },
                  maxLength: { value: 2000, message: 'Please keep this under 2000 characters.' },
                })}
                rows={5}
                aria-invalid={Boolean(errors.body)}
                aria-describedby={errors.body ? `${uid}-body-error` : undefined}
                className="w-full rounded-lg p-3 text-body-sm"
              />
              {errors.body && (
                <p id={`${uid}-body-error`} className="text-label-sm text-danger">
                  {errors.body.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-accent px-4 py-2 text-label-md text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2">
          <h2 className="text-headline-md">{manages ? 'All requests' : 'Your requests'}</h2>
          <span className="text-label-sm text-fg-muted">
            {requests.meta.open} open of {requests.meta.total}
          </span>
        </div>

        {listError && (
          <div
            role="alert"
            className="border-b border-danger/30 bg-danger/5 px-4 py-2 text-body-sm text-danger"
          >
            {listError}
          </div>
        )}

        {requests.data.length === 0 ? (
          <p className="px-4 py-10 text-center text-body-sm text-fg-muted">
            {manages ? 'No requests have been raised yet.' : 'You have not raised any requests.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {requests.data.map((request) => (
              <li key={request.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium">{request.subject}</p>
                    <p className="mt-1 whitespace-pre-line text-body-sm text-fg-muted">
                      {request.body}
                    </p>
                    <p className="mt-2 text-label-sm text-fg-muted/80">
                      {manages ? `${request.user.name} · ` : ''}
                      {formatDateTime(request.createdAt, viewer)}
                      {request.resolvedBy && ` · closed by ${request.resolvedBy.name}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill status={request.status} />
                    {manages && (
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => toggleStatus(request)}
                        className="rounded-lg border border-border px-2.5 py-1 text-label-sm transition-colors hover:border-border-strong disabled:opacity-60"
                      >
                        {request.status === 'OPEN' ? 'Close' : 'Reopen'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
