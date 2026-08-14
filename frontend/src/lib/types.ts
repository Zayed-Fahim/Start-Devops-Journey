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
export interface UserQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  order?: string;
}
