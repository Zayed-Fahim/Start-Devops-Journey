import 'server-only';
import { cookies } from 'next/headers';
import type { UserQuery, UserStats, UsersResponse, User } from './types';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:5000';

export class ApiFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiFetchError';
  }
}

async function serverFetch<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  let res: Response;

  try {
    res = await fetch(`${INTERNAL_API_URL}${path}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (cause) {
    throw new ApiFetchError(
      cause instanceof Error && cause.name === 'TimeoutError'
        ? `The API did not respond within 8s (${INTERNAL_API_URL})`
        : `Could not reach the API at ${INTERNAL_API_URL}`,
    );
  }

  if (!res.ok) {
    throw new ApiFetchError(`API responded ${res.status} for ${path}`, res.status);
  }

  return res.json() as Promise<T>;
}

export function buildUsersQuery(query: UserQuery): string {
  const params = new URLSearchParams();
  const keys: (keyof UserQuery)[] = [
    'page',
    'limit',
    'search',
    'role',
    'status',
    'sortBy',
    'order',
  ];

  keys.forEach((key) => {
    const value = query[key];
    if (value !== undefined && value !== '') params.set(key, value);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getUsers(query: UserQuery): Promise<UsersResponse> {
  return serverFetch<UsersResponse>(`/api/users${buildUsersQuery(query)}`);
}

export function getUserStats(): Promise<UserStats> {
  return serverFetch<UserStats>('/api/users/stats');
}

export async function getSessionUser(): Promise<User | null> {
  try {
    return await serverFetch<User>('/api/auth/me');
  } catch {
    return null;
  }
}
