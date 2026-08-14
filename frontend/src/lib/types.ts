export const ROLES = ['ADMIN', 'DEVELOPER', 'USER'] as const;
export const STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type Role = (typeof ROLES)[number];
export type Status = (typeof STATUSES)[number];
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  createdAt: string;
  updatedAt: string;
}
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface UsersResponse {
  data: User[];
  meta: PageMeta;
}
export interface UserStats {
  total: number;
  byRole: Record<Role, number>;
  byStatus: Record<Status, number>;
}
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      message: string;
    }[];
  };
}
export const SORTABLE_COLUMNS = ['name', 'email', 'role', 'status', 'createdAt'] as const;
export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];
export const AUDIT_CATEGORIES = ['CREATE', 'UPDATE', 'DELETE', 'SECURITY'] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_RANGES = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
] as const;

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorLabel: string;
  action: string;
  category: AuditCategory;
  summary: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: PageMeta;
}

export interface AuditQuery {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  range?: string;
}

export interface SessionSummary {
  id: string;
  device: string;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}

export interface UserQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  order?: string;
}
