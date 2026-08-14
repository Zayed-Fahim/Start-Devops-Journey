const usersService = require("../services/users.service");
const { notFound } = require("../lib/httpError");
const {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  parseOrThrow,
} = require("../validation/users.validation");

// Controllers stay thin on purpose: validate input, call the service, choose a
// status code. No Prisma calls and no business rules live here, so the service
// remains usable from a seed script or a worker with no Express in sight.

const listUsers = async (req, res) => {
  const query = parseOrThrow(
    listUsersQuerySchema,
    req.query,
    "Invalid query parameters"
  );
  res.status(200).json(await usersService.listUsers(query));
};

const getStats = async (_req, res) => {
  res.status(200).json(await usersService.getStats());
};

const getUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, "Invalid user id");
  const user = await usersService.getUserById(id);
  if (!user) throw notFound(`No user found with id ${id}`);
  res.status(200).json(user);
};

const createUser = async (req, res) => {
  const data = parseOrThrow(createUserSchema, req.body, "Invalid request body");
  // 201 + Location is the correct answer to a successful POST that created a
  // resource; the client learns the canonical URL without guessing it.
  const user = await usersService.createUser(data);
  res.status(201).location(`/api/users/${user.id}`).json(user);
};

const updateUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, "Invalid user id");
  const data = parseOrThrow(updateUserSchema, req.body, "Invalid request body");
  res.status(200).json(await usersService.updateUser(id, data));
};

const deleteUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, "Invalid user id");
  await usersService.deleteUser(id);
  // 204 No Content: the delete succeeded and there is deliberately nothing to
  // send back. Note `.end()`, not `.json()` -- a 204 with a body is a protocol
  // violation and some proxies will strip it or complain.
  res.status(204).end();
};

module.exports = {
  listUsers,
  getStats,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
