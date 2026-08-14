import "server-only";

import type { UserQuery, UserStats, UsersResponse } from "./types";

/**
 * SERVER-SIDE API access. Runs inside the `frontend` container (or the Node
 * process during `next dev`), never in the browser.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ THE TWO-URL PROBLEM — the single most common Docker mistake in a Next.js │
 * │ stack, and the reason this file has a sibling called api-browser.ts.     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * The frontend talks to the backend from two different places, and those two
 * places do NOT share a DNS namespace:
 *
 *   Server Component / Route Handler          Client Component ("use client")
 *   runs INSIDE the frontend container        runs in the USER'S BROWSER
 *   on Docker's app-network                   on the user's laptop
 *   `backend` resolves via Docker DNS  ✅     `backend` means nothing      ❌
 *   → INTERNAL_API_URL=http://backend:3001    → NEXT_PUBLIC_API_URL=
 *                                                  http://localhost:3001
 *
 * Use one variable for both and one of the two callers always breaks:
 *   - browser given http://backend:3001  → ERR_NAME_NOT_RESOLVED
 *   - server given http://localhost:3001 → ECONNREFUSED, because inside the
 *     frontend container `localhost` is the frontend itself, and nothing is
 *     listening on :3001 there.
 *
 * The other half of the distinction is WHEN each is read. `NEXT_PUBLIC_*` is
 * inlined into the JavaScript bundle at BUILD time and shipped to every
 * visitor — which is why it must never hold a secret. `INTERNAL_API_URL` is
 * read at RUNTIME, server-side only, and never leaves the container.
 *
 * The `server-only` import at the top is a tripwire: if this module is ever
 * imported from a Client Component, the BUILD fails with a clear message
 * instead of shipping a container-internal hostname to the browser.
 */
const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ?? "http://backend:3001";

export class ApiFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiFetchError";
  }
}

async function serverFetch<T>(path: string): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${INTERNAL_API_URL}${path}`, {
      // This dashboard must reflect writes immediately. Next 15 does not cache
      // fetches by default, but stating it makes the intent explicit and
      // survives a future config change that flips the default back.
      cache: "no-store",
      headers: { Accept: "application/json" },
      // Without a timeout a hung backend turns into a hung page render and the
      // user stares at a blank tab until the browser gives up.
      signal: AbortSignal.timeout(8000),
    });
  } catch (cause) {
    // Network-level failure: DNS, connection refused, timeout. This is the
    // branch that fires when INTERNAL_API_URL is wrong.
    throw new ApiFetchError(
      cause instanceof Error && cause.name === "TimeoutError"
        ? `The API did not respond within 8s (${INTERNAL_API_URL})`
        : `Could not reach the API at ${INTERNAL_API_URL}`
    );
  }

  if (!res.ok) {
    throw new ApiFetchError(
      `API responded ${res.status} for ${path}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

/** Forward only the params the API understands; drop empty values so a
 *  cleared filter means "no filter" rather than "match empty string". */
export function buildUsersQuery(query: UserQuery): string {
  const params = new URLSearchParams();
  const keys: (keyof UserQuery)[] = [
    "page",
    "limit",
    "search",
    "role",
    "status",
    "sortBy",
    "order",
  ];

  for (const key of keys) {
    const value = query[key];
    if (value !== undefined && value !== "") params.set(key, value);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getUsers(query: UserQuery): Promise<UsersResponse> {
  return serverFetch<UsersResponse>(`/api/users${buildUsersQuery(query)}`);
}

export function getUserStats(): Promise<UserStats> {
  return serverFetch<UserStats>("/api/users/stats");
}
