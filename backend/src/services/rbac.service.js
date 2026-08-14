const prisma = require('../lib/prisma');

const CACHE_TTL_MS = 30_000;

const cache = new Map();

const ROLE_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
});

const loadPermissions = async (roleId) => {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { key: true } } },
  });
  return rows.map((row) => row.permission.key);
};

const getPermissionsForRole = async (roleId) => {
  if (!roleId) return [];

  const cached = cache.get(roleId);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const keys = await loadPermissions(roleId);
  cache.set(roleId, { keys, expiresAt: Date.now() + CACHE_TTL_MS });
  return keys;
};

const invalidateRole = (roleId) => {
  if (roleId) cache.delete(roleId);
  else cache.clear();
};

const listPermissions = () =>
  prisma.permission.findMany({
    select: { id: true, key: true, label: true, description: true, group: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
  });

const listRoles = async () => {
  const roles = await prisma.accessRole.findMany({
    select: {
      ...ROLE_SELECT,
      permissions: { select: { permission: { select: { key: true } } } },
      _count: { select: { users: true } },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role._count.users,
    permissions: role.permissions.map((entry) => entry.permission.key).sort(),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));
};

const getRole = async (id) => {
  const role = await prisma.accessRole.findUnique({
    where: { id },
    select: { ...ROLE_SELECT, permissions: { select: { permission: { select: { key: true } } } } },
  });
  if (!role) return null;
  return { ...role, permissions: role.permissions.map((entry) => entry.permission.key).sort() };
};

const resolvePermissionIds = async (keys) => {
  const found = await prisma.permission.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });

  const missing = keys.filter((key) => !found.some((permission) => permission.key === key));
  return { ids: found.map((permission) => permission.id), missing };
};

const createRole = async ({ name, description, permissions }) => {
  const { ids, missing } = await resolvePermissionIds(permissions);
  if (missing.length > 0) return { missing };

  const role = await prisma.accessRole.create({
    data: {
      name,
      description: description ?? null,
      isSystem: false,
      permissions: { create: ids.map((permissionId) => ({ permissionId })) },
    },
    select: ROLE_SELECT,
  });

  return { role: await getRole(role.id) };
};

const MANAGE_KEY = 'roles.manage';

const wouldOrphanRoleManagement = async (roleId, nextPermissions) => {
  if (nextPermissions.includes(MANAGE_KEY)) return false;

  const others = await prisma.rolePermission.count({
    where: { roleId: { not: roleId }, permission: { key: MANAGE_KEY } },
  });

  return others === 0;
};

const roleHoldsManage = async (roleId) =>
  (await prisma.rolePermission.count({
    where: { roleId, permission: { key: MANAGE_KEY } },
  })) > 0;

const updateRolePermissions = async (id, permissions) => {
  const { ids, missing } = await resolvePermissionIds(permissions);
  if (missing.length > 0) return { missing };

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId: id, permissionId })),
    }),
    prisma.accessRole.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  invalidateRole(id);
  return { role: await getRole(id) };
};

const updateRoleDetails = async (id, { name, description }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (Object.keys(data).length === 0) return getRole(id);

  await prisma.accessRole.update({ where: { id }, data });
  invalidateRole(id);
  return getRole(id);
};

const deleteRole = async (id) => {
  const deleted = await prisma.accessRole.delete({
    where: { id },
    select: { id: true, name: true },
  });
  invalidateRole(id);
  return deleted;
};

module.exports = {
  MANAGE_KEY,
  wouldOrphanRoleManagement,
  roleHoldsManage,
  getPermissionsForRole,
  invalidateRole,
  listPermissions,
  listRoles,
  getRole,
  createRole,
  updateRolePermissions,
  updateRoleDetails,
  deleteRole,
};
