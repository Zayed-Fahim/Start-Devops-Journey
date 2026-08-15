'use client';

import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createUser, updateUser, type UserInput } from '@/lib/api-browser';
import { applyServerErrors } from '@/lib/form-errors';
import { STATUSES, type Role, type Status, type User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';
import { PasswordInput } from './PasswordInput';
import { Select } from './Select';

const LEAST_PRIVILEGED_ROLE = 'USER';

interface Props {
  open: boolean;
  onClose: () => void;
  roles: string[];
  user?: User;
}

interface UserValues {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: Status;
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
        <p id={`${htmlFor}-hint`} className="text-body-sm text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function UserFormModal({ open, onClose, roles, user }: Props) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const uid = useId();
  const options = user?.role && !roles.includes(user.role) ? [user.role, ...roles] : roles;
  const fallbackRole = options.includes(LEAST_PRIVILEGED_ROLE)
    ? LEAST_PRIVILEGED_ROLE
    : (options.at(-1) ?? '');

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserValues>({
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      password: '',
      role: user?.role ?? fallbackRole,
      status: user?.status ?? 'ACTIVE',
    },
  });

  let submitLabel = 'Create user';
  if (isSubmitting) submitLabel = 'Saving…';
  else if (isEdit) submitLabel = 'Save changes';

  const inputClass = (hasError: boolean) =>
    cn(
      'h-10 w-full rounded-lg border bg-bg px-3 text-sm text-fg placeholder:text-fg-muted',
      hasError ? 'border-danger' : 'border-border focus-visible:border-accent',
    );

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && user) {
        const patch: Partial<UserInput> = {
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
        };
        if (values.password) patch.password = values.password;
        await updateUser(user.id, patch);
      } else {
        await createUser(values);
      }
      router.refresh();
      onClose();
    } catch (error) {
      applyServerErrors(error, setError, ['name', 'email', 'password', 'role', 'status']);
    }
  });

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
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {errors.root && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          >
            {errors.root.message}
          </div>
        )}

        <Field label="Name" htmlFor={`${uid}-name`} error={errors.name?.message}>
          <input
            id={`${uid}-name`}
            {...register('name', {
              required: 'Name is required.',
              maxLength: { value: 120, message: 'Name must be 120 characters or fewer.' },
            })}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${uid}-name-error` : undefined}
            className={inputClass(Boolean(errors.name))}
          />
        </Field>

        <Field label="Email" htmlFor={`${uid}-email`} error={errors.email?.message}>
          <input
            id={`${uid}-email`}
            type="email"
            {...register('email', {
              required: 'Email is required.',
              maxLength: { value: 255, message: 'Email must be 255 characters or fewer.' },
            })}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${uid}-email-error` : undefined}
            className={cn(inputClass(Boolean(errors.email)), 'font-mono')}
          />
        </Field>

        <Field
          label={isEdit ? 'New password' : 'Password'}
          htmlFor={`${uid}-password`}
          error={errors.password?.message}
          hint={isEdit ? 'Leave blank to keep the current password' : '6 to 32 characters'}
        >
          <PasswordInput
            id={`${uid}-password`}
            {...register('password', {
              required: isEdit ? false : 'Password is required.',
            })}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? `${uid}-password-error` : `${uid}-password-hint`}
            className={inputClass(Boolean(errors.password))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Role" htmlFor={`${uid}-role`} error={errors.role?.message}>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  id={`${uid}-role`}
                  value={field.value}
                  onChange={field.onChange}
                  label="Role"
                  invalid={Boolean(errors.role)}
                  options={options.map((value) => ({ value, label: value }))}
                />
              )}
            />
          </Field>

          <Field label="Status" htmlFor={`${uid}-status`} error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  id={`${uid}-status`}
                  value={field.value}
                  onChange={(next) => field.onChange(next as Status)}
                  label="Status"
                  invalid={Boolean(errors.status)}
                  options={STATUSES.map((value) => ({ value, label: value }))}
                />
              )}
            />
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
            disabled={isSubmitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
