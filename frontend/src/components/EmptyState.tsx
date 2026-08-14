import Link from 'next/link';

const IconInbox = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="size-10 text-fg-muted"
    aria-hidden="true"
  >
    <path d="M3 13h4l2 3h6l2-3h4" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M5 5h14l2 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export function EmptyState({
  filtered,
  onCreate,
}: {
  filtered: boolean;
  onCreate?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {IconInbox}
      <h2 className="text-base font-semibold">
        {filtered ? 'No users match these filters' : 'No users yet'}
      </h2>
      <p className="max-w-sm text-sm text-fg-muted">
        {filtered
          ? 'Try a different search term, or clear the filters to see everyone.'
          : 'Create your first user, or run `yarn seed` in the backend to load 25 sample users.'}
      </p>
      {filtered ? (
        <Link
          href="/"
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
        >
          Clear filters
        </Link>
      ) : (
        onCreate
      )}
    </div>
  );
}
