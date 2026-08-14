const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const { badRequest } = require('../lib/httpError');
const { STATUSES } = require('../validation/users.validation');

const USER_SELECT = Object.freeze({
  id: true,
  name: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  roleId: true,
  roleRef: { select: { name: true } },
});

const toPublicUser = (user) => {
  if (!user) return user;
  const { roleRef, ...rest } = user;
  return { ...rest, role: roleRef?.name ?? null };
};

const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

const listRoleNames = async () => {
  const roles = await prisma.accessRole.findMany({
    select: { name: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  return roles.map((role) => role.name);
};

const resolveRoleId = async (roleName) => {
  if (roleName === undefined) return undefined;

  const role = await prisma.accessRole.findUnique({
    where: { name: roleName },
    select: { id: true },
  });

  if (!role) {
    const available = await listRoleNames();
    throw badRequest('Invalid role', [
      { field: 'role', message: `Role must be one of: ${available.join(', ')}` },
    ]);
  }

  return role.id;
};

const escapeLike = (value) =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

const buildWhere = ({ search, role, status }) => {
  const where = {};
  if (role) where.roleRef = { name: role };
  if (status) where.status = status;
  if (search) {
    const term = escapeLike(search);
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ];
  }
  return where;
};

const orderFor = (sortBy, order) =>
  sortBy === 'role' ? { roleRef: { name: order } } : { [sortBy]: order };

const listUsers = async ({ page, limit, search, role, status, sortBy, order }) => {
  const where = buildWhere({ search, role, status });
  const skip = (page - 1) * limit;

  const [total, data] = await prisma.$transaction(
    [
      prisma.user.count({ where }),
      prisma.user.findMany({
        relationLoadStrategy: 'join',
        where,
        select: USER_SELECT,
        orderBy: [orderFor(sortBy, order), { id: 'asc' }],
        skip,
        take: limit,
      }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );

  return {
    data: data.map(toPublicUser),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getUserById = async (id) =>
  toPublicUser(
    await prisma.user.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      select: USER_SELECT,
    }),
  );

const createUser = async ({ password, role, ...rest }) =>
  toPublicUser(
    await prisma.user.create({
      data: {
        ...rest,
        password: await hashPassword(password),
        roleId: await resolveRoleId(role),
      },
      select: USER_SELECT,
    }),
  );

const updateUser = async (id, { password, role, ...rest }) => {
  const data = { ...rest };
  if (password !== undefined) data.password = await hashPassword(password);
  if (role !== undefined) data.roleId = await resolveRoleId(role);
  return toPublicUser(await prisma.user.update({ where: { id }, data, select: USER_SELECT }));
};

const deleteUser = (id) =>
  prisma.user.delete({ where: { id }, select: { id: true, name: true, email: true } });

const getStats = async () => {
  const [total, roles, statusGroups] = await prisma.$transaction([
    prisma.user.count(),
    prisma.accessRole.findMany({
      select: { name: true, _count: { select: { users: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const byRole = Object.fromEntries(roles.map((role) => [role.name, role._count.users]));

  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  statusGroups.forEach((row) => {
    byStatus[row.status] = row._count._all;
  });

  const unassigned = total - Object.values(byRole).reduce((sum, count) => sum + count, 0);
  if (unassigned > 0) byRole.UNASSIGNED = unassigned;

  return { total, byRole, byStatus, roles: roles.map((role) => role.name) };
};

module.exports = {
  USER_SELECT,
  toPublicUser,
  listRoleNames,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getStats,
};
