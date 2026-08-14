"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Modal } from "./Modal";
import { ApiError, createUser, updateUser, type UserInput } from "@/lib/api-browser";
import { ROLES, STATUSES, type Role, type Status, type User } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Create and edit share ONE form. The only differences are the initial values,
 * the request method, and whether the password field is required — which is
 * not enough divergence to justify two components that then drift apart.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  /** undefined = create mode, a user = edit mode */
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
      {/* The error is linked to the input via aria-describedby (see below), so
          a screen reader announces it on focus. Red text alone is invisible to
          anyone not looking directly at it. */}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function UserFormModal({ open, onClose, user }: Props) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const uid = useId();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(user?.role ?? "USER");
  const [status, setStatus] = useState<Status>(user?.status ?? "ACTIVE");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputClass = (hasError: boolean) =>
    cn(
      "h-10 w-full rounded-lg border bg-bg px-3 text-sm text-fg placeholder:text-fg-muted",
      hasError ? "border-danger" : "border-border focus-visible:border-accent"
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      if (isEdit && user) {
        const patch: Partial<UserInput> = { name, email, role, status };
        // Only send a password if one was typed. Sending "" would fail
        // validation, and sending the old hash would double-hash it.
        if (password) patch.password = password;
        await updateUser(user.id, patch);
      } else {
        await createUser({ name, email, password, role, status });
      }

      // Re-run the Server Components so the table and the stat cards both
      // reflect the write. No client cache to invalidate, because the server
      // is the only source of truth here.
      router.refresh();
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        // The API returns details[] as [{field, message}], which maps straight
        // onto the inputs — this is the payoff for the backend using ONE error
        // envelope everywhere.
        const mapped = error.fieldErrors();
        setFieldErrors(mapped);
        // 409 duplicate email arrives with a field detail, so only show the
        // banner when nothing could be attached to a specific input.
        if (Object.keys(mapped).length === 0) setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit user" : "Add user"}
      description={
        isEdit
          ? "Update this user's details. Leave the password blank to keep it unchanged."
          : "Create a new user record."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
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
            className={cn(inputClass(Boolean(fieldErrors.email)), "font-mono")}
          />
        </Field>

        <Field
          label={isEdit ? "New password" : "Password"}
          htmlFor={`${uid}-password`}
          error={fieldErrors.password}
          hint={isEdit ? "Leave blank to keep the current password" : "At least 8 characters"}
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
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
