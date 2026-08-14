export const STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type Role = string;
export type Status = (typeof STATUSES)[number];
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}
export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  group: 'top' | 'primary' | 'secondary' | 'support';
  external?: boolean;
}

export type TimeFormat = 'H12' | 'H24';

export interface DocumentPage {
  id: string;
  kind: 'DOCS' | 'SUPPORT';
  slug: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: { id: string; name: string } | null;
  canEdit: boolean;
}

export interface SupportRequest {
  id: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'CLOSED';
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  resolvedBy: { id: string; name: string } | null;
}

export interface SupportRequestsResponse {
  data: SupportRequest[];
  meta: PageMeta & { open: number; manages: boolean };
}

export interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  category: AuditCategory;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: PageMeta & { unread: number; hasMore: boolean };
}

export interface SessionUser extends User {
  permissions: string[];
  navigation: NavItem[];
  country: string | null;
  timezone: string | null;
  timeFormat: TimeFormat;
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
  byRole: Record<string, number>;
  byStatus: Record<Status, number>;
  roles: string[];
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

export interface AuditStats {
  total: number;
  byCategory: Record<AuditCategory, number>;
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

export interface PermissionDef {
  id: string;
  key: string;
  label: string;
  description: string | null;
  group: string;
  sortOrder: number;
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleSummary extends RoleDetail {
  userCount: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  leadUserId: string | null;
  lead: { id: string; name: string } | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  joinedAt: string;
  name: string;
  email: string;
  status: Status;
  role: Role | null;
}

export interface TeamMembersResponse {
  data: TeamMember[];
  meta: PageMeta;
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
