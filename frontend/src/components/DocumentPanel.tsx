'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { saveDocumentPage } from '@/lib/api-browser';
import { formatDateTime } from '@/lib/datetime';
import { applyServerErrors } from '@/lib/form-errors';
import { renderMarkdown } from '@/lib/markdown';
import type { DocumentPage, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DocumentValues {
  title: string;
  body: string;
}

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
  const [preview, setPreview] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DocumentValues>({
    defaultValues: { title: page.title, body: page.body },
  });

  const draftBody = useWatch({ control, name: 'body' });

  const cancel = () => {
    reset({ title: page.title, body: page.body });
    setPreview(false);
    setEditing(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await saveDocumentPage(kind, { title: values.title.trim(), body: values.body.trim() });
      setEditing(false);
      setPreview(false);
      startTransition(() => router.refresh());
    } catch (error) {
      applyServerErrors(error, setError, ['title', 'body']);
    }
  });

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
              disabled={isSubmitting}
              className="rounded-lg bg-accent px-3 py-1.5 text-label-md text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {(errors.root ?? errors.title ?? errors.body) && (
        <div
          role="alert"
          className="border-b border-danger/30 bg-danger/5 px-4 py-2 text-body-sm text-danger"
        >
          {(errors.root ?? errors.title ?? errors.body)?.message}
        </div>
      )}

      {editing ? (
        <form id={`${uid}-form`} onSubmit={onSubmit} className="space-y-4 p-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-title`} className="block text-label-md">
              Title
            </label>
            <input
              id={`${uid}-title`}
              {...register('title', {
                required: 'A title is required.',
                maxLength: { value: 160, message: 'Title must be 160 characters or fewer.' },
              })}
              aria-invalid={Boolean(errors.title)}
              className="h-10 w-full rounded-lg px-3 text-body-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-body`} className="block text-label-md">
              Content
            </label>
            <div className={cn(preview && 'hidden')}>
              <textarea
                id={`${uid}-body`}
                {...register('body', {
                  required: 'Content cannot be empty.',
                  maxLength: {
                    value: 20000,
                    message: 'Content must be 20000 characters or fewer.',
                  },
                })}
                rows={16}
                aria-invalid={Boolean(errors.body)}
                className="w-full rounded-lg p-3 font-mono text-body-sm"
              />
            </div>
            {preview && (
              <div
                className="prose-page min-h-64 rounded-lg border border-border bg-bg p-4"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(draftBody) }}
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
