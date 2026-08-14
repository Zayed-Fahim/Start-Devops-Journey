const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const { ROLES, STATUSES } = require('../validation/users.validation');

const USER_SELECT = Object.freeze({
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);
const escapeLike = (value) =>
  value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
const buildWhere = ({ search, role, status }) => {
  const where = {};
  if (role) where.role = role;
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
const listUsers = async ({ page, limit, search, role, status, sortBy, order }) => {
  const where = buildWhere({ search, role, status });
  const skip = (page - 1) * limit;
  const [total, data] = await prisma.$transaction(
    [
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ [sortBy]: order }, { id: 'asc' }],
        skip,
        take: limit,
      }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const getUserById = (id) => prisma.user.findUnique({ where: { id }, select: USER_SELECT });
const createUser = async ({ password, ...rest }) =>
  prisma.user.create({
    data: { ...rest, password: await hashPassword(password) },
    select: USER_SELECT,
  });
const updateUser = async (id, { password, ...rest }) => {
  const data = { ...rest };
  if (password !== undefined) data.password = await hashPassword(password);
  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
};
const deleteUser = (id) => prisma.user.delete({ where: { id }, select: { id: true } });
const getStats = async () => {
  const [total, roleGroups, statusGroups] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const byRole = Object.fromEntries(ROLES.map((role) => [role, 0]));
  for (const row of roleGroups) byRole[row.role] = row._count._all;
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const row of statusGroups) byStatus[row.status] = row._count._all;
  return { total, byRole, byStatus };
};
module.exports = {
  USER_SELECT,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getStats,
};
