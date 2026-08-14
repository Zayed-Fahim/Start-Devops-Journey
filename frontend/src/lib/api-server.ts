import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type {
  PermissionDef,
  TeamMembersResponse,
  TeamSummary,
  RoleSummary,
  SessionSummary,
  UserQuery,
  UserStats,
  UsersResponse,
  SessionUser,
  AuditQuery,
  AuditLogsResponse,
} from './types';

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

export const getUserStats = cache((): Promise<UserStats> =>
  serverFetch<UserStats>('/api/users/stats'),
);

export function getAuditLogs(query: AuditQuery): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  (['page', 'limit', 'search', 'category', 'range'] as (keyof AuditQuery)[]).forEach((key) => {
    const value = query[key];
    if (value !== undefined && value !== '') params.set(key, value);
  });
  const qs = params.toString();
  return serverFetch<AuditLogsResponse>(`/api/audit-logs${qs ? `?${qs}` : ''}`);
}

export function getSessions(): Promise<{ data: SessionSummary[] }> {
  return serverFetch<{ data: SessionSummary[] }>('/api/account/sessions');
}

export function getRoles(): Promise<{ data: RoleSummary[] }> {
  return serverFetch<{ data: RoleSummary[] }>('/api/roles');
}

export function getPermissionCatalogue(): Promise<{ data: PermissionDef[] }> {
  return serverFetch<{ data: PermissionDef[] }>('/api/roles/permissions');
}

export function getTeams(): Promise<{ data: TeamSummary[] }> {
  return serverFetch<{ data: TeamSummary[] }>('/api/teams');
}

export function getTeamMembers(id: string): Promise<TeamMembersResponse> {
  return serverFetch<TeamMembersResponse>(`/api/teams/${id}/members?limit=100`);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    return await serverFetch<SessionUser>('/api/auth/me');
  } catch {
    return null;
  }
}
