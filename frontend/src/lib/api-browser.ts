import type { ApiErrorBody, Role, Status, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

const CSRF_COOKIE = 'csrf_token';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: {
      field: string;
      message: string;
    }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    (this.details ?? []).forEach((detail) => {
      if (!map[detail.field]) map[detail.field] = detail.message;
    });
    return map;
  }
}

function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

async function request<T>(path: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const csrfToken = readCsrfToken();
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'Could not reach the API. Is the backend running, and does CORS_ORIGIN allow this page?',
      0,
    );
  }

  if (res.status === 401 && retryOn401 && path !== '/api/auth/refresh') {
    const refreshed = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (refreshed.ok) return request<T>(path, init, false);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(`Unexpected non-JSON response (${res.status})`, res.status);
  }

  if (!res.ok) {
    const err = (body as ApiErrorBody)?.error;
    throw new ApiError(
      err?.message ?? `Request failed with status ${res.status}`,
      res.status,
      err?.code,
      err?.details,
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

export interface SessionResponse {
  user: User;
  csrfToken: string;
}

export const createUser = (input: UserInput) =>
  request<User>('/api/users', { method: 'POST', body: JSON.stringify(input) });

export const updateUser = (id: string, input: Partial<UserInput>) =>
  request<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteUser = (id: string) => request<void>(`/api/users/${id}`, { method: 'DELETE' });

export const login = (email: string, password: string) =>
  request<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const registerAccount = (name: string, email: string, password: string) =>
  request<SessionResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

export const logout = () => request<void>('/api/auth/logout', { method: 'POST' });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ revokedSessions: number }>('/api/account/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const revokeSession = (id: string) =>
  request<{ revoked: number }>(`/api/account/sessions/${id}`, { method: 'DELETE' });

export const revokeOtherSessions = () =>
  request<{ revoked: number }>('/api/account/sessions/revoke-others', { method: 'POST' });

export interface RoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const createRole = (input: RoleInput) =>
  request<unknown>('/api/roles', { method: 'POST', body: JSON.stringify(input) });

export const updateRole = (id: string, input: RoleInput) =>
  request<unknown>(`/api/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const deleteRole = (id: string) => request<void>(`/api/roles/${id}`, { method: 'DELETE' });
