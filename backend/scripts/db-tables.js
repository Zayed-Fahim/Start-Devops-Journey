const prisma = require('../src/lib/prisma');
const env = require('../src/lib/env');

const TABLES = Object.freeze([
  {
    key: 'audit-logs',
    timeField: 'createdAt',
    label: 'audit_logs',
    delegate: () => prisma.auditLog,
    transactional: true,
  },
  {
    key: 'notifications',
    timeField: 'createdAt',
    label: 'notifications',
    delegate: () => prisma.notification,
    transactional: true,
  },
  {
    key: 'support-requests',
    timeField: 'createdAt',
    label: 'support_requests',
    delegate: () => prisma.supportRequest,
    transactional: true,
  },
  {
    key: 'sessions',
    timeField: 'createdAt',
    label: 'refresh_tokens',
    delegate: () => prisma.refreshToken,
    transactional: true,
  },
  {
    key: 'team-members',
    label: 'team_members',
    delegate: () => prisma.teamMember,
    transactional: true,
    timeField: 'joinedAt',
  },
  {
    key: 'teams',
    timeField: 'createdAt',
    label: 'teams',
    delegate: () => prisma.team,
    transactional: true,
  },
  {
    key: 'custom-roles',
    timeField: 'createdAt',
    label: 'roles (isSystem = false only)',
    delegate: () => prisma.accessRole,
    transactional: true,
    where: { isSystem: false },
  },
  {
    key: 'users',
    timeField: 'createdAt',
    label: 'users',
    delegate: () => prisma.user,
    transactional: false,
  },
  {
    key: 'documents',
    timeField: 'createdAt',
    label: 'documents',
    delegate: () => prisma.document,
    transactional: false,
    catalogue: true,
  },
  {
    key: 'system-roles',
    timeField: 'createdAt',
    label: 'roles (isSystem = true only)',
    delegate: () => prisma.accessRole,
    transactional: false,
    catalogue: true,
    where: { isSystem: true },
  },
  {
    key: 'permissions',
    label: 'permissions',
    delegate: () => prisma.permission,
    transactional: false,
    catalogue: true,
  },
]);

const byKey = new Map(TABLES.map((table) => [table.key, table]));

const findTable = (key) => byKey.get(key);

const countRows = (table) =>
  table.delegate().count(table.where ? { where: table.where } : undefined);

const clearTable = async (table) => {
  const result = await table.delegate().deleteMany(table.where ? { where: table.where } : {});
  return result.count;
};

const countAll = async (tables) => {
  const counts = await Promise.all(tables.map((table) => countRows(table)));
  return tables.map((table, index) => ({ table, count: counts[index] }));
};

const superAdminEmail = () => env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? null;

const findSuperAdmin = async () => {
  const email = superAdminEmail();
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
};

module.exports = {
  TABLES,
  findTable,
  countRows,
  countAll,
  clearTable,
  superAdminEmail,
  findSuperAdmin,
};
