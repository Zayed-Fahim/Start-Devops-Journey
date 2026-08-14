'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import { ApiError, saveDocumentPage } from '@/lib/api-browser';
import { formatDateTime } from '@/lib/datetime';
import { renderMarkdown } from '@/lib/markdown';
import type { DocumentPage, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DocumentPanel({
  kind,
  page,
  viewer,
}: {
  kind: 'docs' | 'support';
  page: DocumentPage;
  viewer: SessionUser;
}) {
  const router = useRouter();
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const cancel = () => {
    setTitle(page.title);
    setBody(page.body);
    setError(null);
    setPreview(false);
    setEditing(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveDocumentPage(kind, { title: title.trim(), body: body.trim() });
      setEditing(false);
      setPreview(false);
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save the page.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-headline-md">{editing ? 'Editing' : page.title}</h2>
          {page.updatedBy && !editing && (
            <p className="text-label-sm text-fg-muted">
              Updated by {page.updatedBy.name} · {formatDateTime(page.updatedAt, viewer)}
            </p>
          )}
        </div>

        {page.canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-label-md transition-colors hover:border-border-strong"
          >
            Edit page
          </button>
        )}

        {editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-label-md transition-colors',
                preview ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border',
              )}
            >
              {preview ? 'Editing' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-border px-3 py-1.5 text-label-md transition-colors hover:border-border-strong"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={`${uid}-form`}
              disabled={saving}
              className="rounded-lg bg-accent px-3 py-1.5 text-label-md text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="border-b border-danger/30 bg-danger/5 px-4 py-2 text-body-sm text-danger"
        >
          {error}
        </div>
      )}

      {editing ? (
        <form id={`${uid}-form`} onSubmit={save} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-title`} className="block text-label-md">
              Title
            </label>
            <input
              id={`${uid}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={160}
              className="h-10 w-full rounded-lg px-3 text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-body`} className="block text-label-md">
              Content
            </label>
            {preview ? (
              <div
                className="prose-page min-h-64 rounded-lg border border-border bg-bg p-4"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
              />
            ) : (
              <textarea
                id={`${uid}-body`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                maxLength={20000}
                rows={16}
                className="w-full rounded-lg p-3 font-mono text-body-sm"
              />
            )}
            <p className="text-label-sm text-fg-muted">
              Markdown: # headings, **bold**, *italic*, `code`, - lists,
              [links](https://example.com). Raw HTML is escaped.
            </p>
          </div>
        </form>
      ) : (
        <div
          className="prose-page p-4"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }}
        />
      )}
    </section>
  );
}
