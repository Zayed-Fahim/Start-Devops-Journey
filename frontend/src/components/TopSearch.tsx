'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { IconSearch } from './NavIcons';

export function TopSearch() {
  const router = useRouter();
  const uid = useId();
  const [term, setTerm] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/?search=${encodeURIComponent(query)}` : '/');
  };

  return (
    <form onSubmit={submit} role="search" className="relative hidden sm:block">
      <label htmlFor={uid} className="sr-only">
        Search users by name or email
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-fg-muted"
      >
        {IconSearch}
      </span>
      <input
        id={uid}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search users…"
        className="h-9 w-56 rounded-lg border border-border bg-bg pl-10 pr-sm text-body-sm text-fg transition-colors placeholder:text-fg-muted focus:border-accent focus:outline-none lg:w-72"
      />
    </form>
  );
}
