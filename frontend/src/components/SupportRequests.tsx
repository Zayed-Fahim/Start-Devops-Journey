'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import { ApiError, createSupportRequest, setSupportRequestStatus } from '@/lib/api-browser';
import { formatDateTime } from '@/lib/datetime';
import type { SessionUser, SupportRequest, SupportRequestsResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createSupportRequest({ subject: subject.trim(), body: body.trim() });
      setSubject('');
      setBody('');
      setSent(true);
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not send the request.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (request: SupportRequest) => {
    setBusy(request.id);
    setError(null);
    try {
      await setSupportRequestStatus(request.id, request.status === 'OPEN' ? 'CLOSED' : 'OPEN');
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update the request.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border bg-surface-raised px-4 py-2">
          <h2 className="text-headline-md">Raise a request</h2>
          <p className="text-label-sm text-fg-muted">
            Tell us what you were doing and what you expected to happen.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 p-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-body-sm text-danger"
            >
              {error}
            </div>
          )}
          {sent && !error && (
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
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              minLength={4}
              maxLength={160}
              placeholder="Cannot open the audit log"
              className="h-10 w-full rounded-lg px-3 text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-body`} className="block text-label-md">
              What happened
            </label>
            <textarea
              id={`${uid}-body`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="w-full rounded-lg p-3 text-body-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent px-4 py-2 text-label-md text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2">
          <h2 className="text-headline-md">{manages ? 'All requests' : 'Your requests'}</h2>
          <span className="text-label-sm text-fg-muted">
            {requests.meta.open} open of {requests.meta.total}
          </span>
        </div>

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
