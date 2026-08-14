import type { ApiErrorBody, Role, Status, User } from "./types";

/**
 * BROWSER-SIDE API access, used by Client Components for mutations.
 *
 * See the long comment in api-server.ts for the full explanation. The short
 * version: this code executes on the user's laptop, which has never heard of
 * Docker's `backend` hostname, so it must use the address that appears in the
 * URL bar — NEXT_PUBLIC_API_URL=http://localhost:3001.
 *
 * NEXT_PUBLIC_ is not a naming convention, it is a contract: Next.js finds
 * these at build time and INLINES them into the JavaScript bundle. That is why
 * it must be written out in full as `process.env.NEXT_PUBLIC_API_URL` — the
 * build-time replacement is textual, so `process.env[key]` with a computed key
 * silently yields undefined. It is also why nothing secret may ever carry this
 * prefix: it ships to every visitor.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** A failed request that still carries the API's structured error body, so a
 *  form can map `details[].field` onto its inputs instead of showing one
 *  generic message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** { email: "This email is already taken" } for inline field errors. */
  fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details ?? []) {
      if (!map[detail.field]) map[detail.field] = detail.message;
    }
    return map;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // fetch() only rejects on network failure, never on a 4xx/5xx. This is
    // also the branch a CORS rejection lands in — the browser blocks the
    // response and reports a generic TypeError with no status.
    throw new ApiError(
      "Could not reach the API. Is the backend running, and does CORS_ORIGIN allow this page?",
      0
    );
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // A non-JSON body from an API that always speaks JSON usually means the
    // request never reached it — a proxy or dev-server error page instead.
    throw new ApiError(`Unexpected non-JSON response (${res.status})`, res.status);
  }

  if (!res.ok) {
    const err = (body as ApiErrorBody)?.error;
    throw new ApiError(
      err?.message ?? `Request failed with status ${res.status}`,
      res.status,
      err?.code,
      err?.details
    );
  }

  return body as T;
}

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: Role;
  status: Status;
}

export const createUser = (input: UserInput) =>
  request<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateUser = (id: string, input: Partial<UserInput>) =>
  request<User>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteUser = (id: string) =>
  request<void>(`/api/users/${id}`, { method: "DELETE" });
