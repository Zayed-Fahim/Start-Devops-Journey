import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-browser';

const FALLBACK = 'Something went wrong. Please try again.';

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: Path<T>[],
) {
  if (!(error instanceof ApiError)) {
    setError('root', { message: FALLBACK });
    return;
  }

  const mapped = error.fieldErrors();
  const known = fields.filter((field) => mapped[field]);

  known.forEach((field, index) => {
    setError(field, { message: mapped[field] }, index === 0 ? { shouldFocus: true } : undefined);
  });

  const unmatched = Object.keys(mapped).filter((field) => !known.includes(field as Path<T>));
  if (known.length === 0) {
    setError('root', {
      message: unmatched.map((field) => mapped[field]).join(' ') || error.message,
    });
  }
}
