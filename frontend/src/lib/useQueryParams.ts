"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * All table state — page, search, filters, sort — lives in the URL.
 *
 * Why the URL and not useState:
 *   - the view is SHAREABLE: paste the link, your colleague sees the same rows
 *   - it SURVIVES REFRESH, so a filtered view is not lost on F5
 *   - the BACK BUTTON works, because each change is a history entry the
 *     browser already understands
 *   - the Server Component re-runs with the new searchParams and re-queries
 *     Postgres, so no client-side state library is needed for any of it
 */
export function useQueryParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | undefined>, { replace = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        // Undefined or empty removes the key entirely, so a cleared filter
        // produces `/` rather than `/?role=&search=` — a cleaner URL, and the
        // API treats an absent param and an empty one the same way anyway.
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }

      const qs = params.toString();
      const url = qs ? `/?${qs}` : "/";

      // replace() for keystrokes and filter tweaks: pushing every debounced
      // search would mean 12 back-button presses to escape "developer".
      // push() for pagination, where stepping back a page is expected.
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, searchParams]
  );

  return { searchParams, setParams };
}
