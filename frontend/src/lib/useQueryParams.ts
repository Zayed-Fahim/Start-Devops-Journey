'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useQueryParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setParams = useCallback(
    (updates: Record<string, string | undefined>, { replace = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') params.delete(key);
        else params.set(key, value);
      });
      const qs = params.toString();
      const url = qs ? `/?${qs}` : '/';
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, searchParams],
  );
  return { searchParams, setParams };
}
