'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { ApiError, createUser, updateUser, type UserInput } from '@/lib/api-browser';
import { ROLES, STATUSES, type Role, type Status, type User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  user?: User;
}
function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}

      {error && (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${htmlFor}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
export function UserFormModal({ open, onClose, user }: Props) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const uid = useId();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'USER');
  const [status, setStatus] = useState<Status>(user?.status ?? 'ACTIVE');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  let submitLabel = 'Create user';
  if (submitting) submitLabel = 'Saving…';
  else if (isEdit) submitLabel = 'Save changes';

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
      if (isEdit && user) {
        const patch: Partial<UserInput> = { name, email, role, status };
        if (password) patch.password = password;
        await updateUser(user.id, patch);
      } else {
        await createUser({ name, email, password, role, status });
      }
      router.refresh();
      onClose();
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
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'Add user'}
      description={
        isEdit
          ? "Update this user's details. Leave the password blank to keep it unchanged."
          : 'Create a new user record.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {formError}
          </div>
        )}

        <Field label="Name" htmlFor={`${uid}-name`} error={fieldErrors.name}>
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
        </Field>

        <Field label="Email" htmlFor={`${uid}-email`} error={fieldErrors.email}>
          <input
            id={`${uid}-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? `${uid}-email-error` : undefined}
            className={cn(inputClass(Boolean(fieldErrors.email)), 'font-mono')}
          />
        </Field>

        <Field
          label={isEdit ? 'New password' : 'Password'}
          htmlFor={`${uid}-password`}
          error={fieldErrors.password}
          hint={isEdit ? 'Leave blank to keep the current password' : 'At least 8 characters'}
        >
          <input
            id={`${uid}-password`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required={!isEdit}
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? `${uid}-password-error` : `${uid}-password-hint`
            }
            className={inputClass(Boolean(fieldErrors.password))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Role" htmlFor={`${uid}-role`} error={fieldErrors.role}>
            <select
              id={`${uid}-role`}
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className={inputClass(Boolean(fieldErrors.role))}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor={`${uid}-status`} error={fieldErrors.status}>
            <select
              id={`${uid}-status`}
              value={status}
              onChange={(event) => setStatus(event.target.value as Status)}
              className={inputClass(Boolean(fieldErrors.status))}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
