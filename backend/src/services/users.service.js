const bcrypt = require("bcryptjs");
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const env = require("../lib/env");
const { ROLES, STATUSES } = require("../validation/users.validation");

/**
 * The ONLY shape of a user that leaves this module.
 *
 * `password` is absent, so the hash is never selected out of Postgres in the
 * first place. This is deliberately not "fetch everything then delete the
 * field before responding": that approach leaks the moment someone adds a new
 * endpoint, logs the object, or returns it from a different code path. Here
 * the data simply never enters the process.
 */
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

/**
 * Escape the characters LIKE/ILIKE treats as wildcards.
 *
 * Prisma parameterises the VALUE (so this is not an injection hole), but it
 * builds the pattern as '%' || value || '%' — and `%` or `_` inside the value
 * are still interpreted by Postgres as wildcards. Without this, searching for
 * "100%" matches every row, and "a_c" matches "abc". Backslash is escaped
 * first, otherwise it would double-escape the escapes we are about to add.
 */
const escapeLike = (value) =>
  value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

const buildWhere = ({ search, role, status }) => {
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    // mode: "insensitive" becomes ILIKE in Postgres. Note this cannot use the
    // btree indexes on name/email -- at 25 rows that is irrelevant, but at a
    // million rows the right answer is a trigram (pg_trgm) index or a
    // tsvector column, not a bigger server.
    const term = escapeLike(search);
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
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
        // The second key is not decoration. `role` and `status` are not
        // unique, so ORDER BY role alone leaves ties in an arbitrary order
        // that Postgres is free to change between queries -- which makes a row
        // appear on page 1 and page 2, or on neither. Appending a unique
        // tiebreaker makes pagination deterministic.
        orderBy: [{ [sortBy]: order }, { id: "asc" }],
        skip,
        take: limit,
      }),
    ],
    // Both statements run in ONE transaction so `total` and the page agree.
    //
    // The isolation level is doing real work here. Postgres defaults to READ
    // COMMITTED, where every statement takes a FRESH snapshot -- so even
    // inside a transaction, a concurrent insert between the count and the
    // select produces a response whose meta contradicts its own data
    // ("Showing 1-10 of 26" above 25 rows). REPEATABLE READ pins one snapshot
    // for the whole transaction, which is what actually delivers the
    // consistency the grouping implies.
    //
    // Safe here precisely because both statements are reads: REPEATABLE READ
    // can abort a transaction with a serialization failure, but only on write
    // conflicts.
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
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

const getUserById = (id) =>
  prisma.user.findUnique({ where: { id }, select: USER_SELECT });

const createUser = async ({ password, ...rest }) =>
  prisma.user.create({
    data: { ...rest, password: await hashPassword(password) },
    select: USER_SELECT,
  });

const updateUser = async (id, { password, ...rest }) => {
  const data = { ...rest };
  if (password !== undefined) data.password = await hashPassword(password);

  // No "find then update": that has a race window in which the row can vanish
  // between the two queries. Prisma raises P2025 when the row is gone, and the
  // error middleware maps it to 404 -- one query, no race.
  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
};

// `select` even though the caller discards the result and responds 204. A bare
// delete() returns the whole row -- including the bcrypt hash -- which then
// exists in this process's memory and in any future log line that prints the
// return value. The invariant at the top of this file is that the hash never
// enters the process; that has to hold on every query, not just the ones whose
// output is rendered.
const deleteUser = (id) =>
  prisma.user.delete({ where: { id }, select: { id: true } });

const getStats = async () => {
  const [total, roleGroups, statusGroups] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  // groupBy only returns rows that EXIST. With no inactive users the
  // INACTIVE key would be missing entirely and the dashboard card would
  // render "undefined" instead of "0". Seed every key first, then overwrite.
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
