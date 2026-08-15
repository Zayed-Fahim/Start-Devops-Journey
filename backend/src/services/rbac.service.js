const prisma = require('../lib/prisma');

const CATALOGUE_TTL_MS = 300_000;

const MANAGE_KEY = 'roles.manage';

const ROLE_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
});

const ROLE_WITH_PERMISSIONS_SELECT = Object.freeze({
  ...ROLE_SELECT,
  permissions: { select: { permission: { select: { key: true } } } },
});

let catalogue = null;

const permissionCatalogue = async () => {
  if (catalogue && catalogue.expiresAt > Date.now()) return catalogue.byKey;

  const rows = await prisma.permission.findMany({ select: { id: true, key: true } });
  catalogue = {
    byKey: new Map(rows.map((row) => [row.key, row.id])),
    expiresAt: Date.now() + CATALOGUE_TTL_MS,
  };
  return catalogue.byKey;
};

const invalidateCatalogue = () => {
  catalogue = null;
};

const resolvePermissionIds = async (keys) => {
  let byKey = await permissionCatalogue();

  if (keys.some((key) => !byKey.has(key))) {
    invalidateCatalogue();
    byKey = await permissionCatalogue();
  }

  const missing = keys.filter((key) => !byKey.has(key));
  return { ids: keys.filter((key) => byKey.has(key)).map((key) => byKey.get(key)), missing };
};

const toRole = (role) =>
  role && { ...role, permissions: role.permissions.map((entry) => entry.permission.key).sort() };

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

const getRole = async (id) =>
  toRole(
    await prisma.accessRole.findUnique({
      where: { id },
      select: ROLE_WITH_PERMISSIONS_SELECT,
    }),
  );

const loadRoleForUpdate = async (id) => {
  const [role, otherManagers] = await prisma.$transaction([
    prisma.accessRole.findUnique({
      where: { id },
      select: ROLE_WITH_PERMISSIONS_SELECT,
    }),
    prisma.rolePermission.count({
      where: { roleId: { not: id }, permission: { key: MANAGE_KEY } },
    }),
  ]);

  return { role: toRole(role), otherManagers };
};

const loadRoleForDelete = async (id) => {
  const [role, userCount] = await prisma.$transaction([
    prisma.accessRole.findUnique({
      where: { id },
      select: ROLE_WITH_PERMISSIONS_SELECT,
    }),
    prisma.user.count({ where: { roleId: id } }),
  ]);

  return { role: toRole(role), userCount };
};

const wouldOrphanRoleManagement = (nextPermissions, otherManagers) =>
  !nextPermissions.includes(MANAGE_KEY) && otherManagers === 0;

const createRole = async ({ id, name, description, permissions }, auditEntry) => {
  const { ids, missing } = await resolvePermissionIds(permissions);
  if (missing.length > 0) return { missing };

  const writes = [
    prisma.accessRole.create({
      data: {
        id,
        name,
        description: description ?? null,
        isSystem: false,
        permissions: { create: ids.map((permissionId) => ({ permissionId })) },
      },
      select: ROLE_WITH_PERMISSIONS_SELECT,
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return { role: toRole(results[0]) };
};

const updateRolePermissions = async (id, permissions, auditEntry) => {
  const { ids, missing } = await resolvePermissionIds(permissions);
  if (missing.length > 0) return { missing };

  const writes = [
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId: id, permissionId })),
    }),
    prisma.accessRole.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: ROLE_SELECT,
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return { role: { ...results[2], permissions: [...permissions].sort() } };
};

const updateRoleDetails = async (id, { name, description }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (Object.keys(data).length === 0) return getRole(id);

  return toRole(
    await prisma.accessRole.update({
      where: { id },
      data,
      select: ROLE_WITH_PERMISSIONS_SELECT,
    }),
  );
};

const deleteRole = async (id, auditEntry) => {
  const writes = [prisma.accessRole.delete({ where: { id }, select: { id: true, name: true } })];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return results[0];
};

module.exports = {
  MANAGE_KEY,
  ROLE_WITH_PERMISSIONS_SELECT,
  invalidateCatalogue,
  wouldOrphanRoleManagement,
  listPermissions,
  listRoles,
  getRole,
  loadRoleForUpdate,
  loadRoleForDelete,
  createRole,
  updateRolePermissions,
  updateRoleDetails,
  deleteRole,
};
