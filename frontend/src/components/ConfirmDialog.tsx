'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, deleteUser } from '@/lib/api-browser';
import type { User } from '@/lib/types';
import { Modal } from './Modal';

export function ConfirmDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteUser(user.id);
      router.refresh();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not delete this user. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="Delete user"
      description="This cannot be undone."
    >
      {user && (
        <div className="space-y-4">
          <p className="text-sm">
            Delete <span className="font-semibold">{user.name}</span>{' '}
            <span className="font-mono text-fg-muted">({user.email})</span>?
          </p>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-danger-fg hover:opacity-90 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete user'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
