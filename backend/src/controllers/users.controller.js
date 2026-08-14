const usersService = require('../services/users.service');
const { notFound } = require('../lib/httpError');
const {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  parseOrThrow,
} = require('../validation/users.validation');

const listUsers = async (req, res) => {
  const query = parseOrThrow(listUsersQuerySchema, req.query, 'Invalid query parameters');
  res.status(200).json(await usersService.listUsers(query));
};
const getStats = async (_req, res) => {
  res.status(200).json(await usersService.getStats());
};
const getUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, 'Invalid user id');
  const user = await usersService.getUserById(id);
  if (!user) throw notFound(`No user found with id ${id}`);
  res.status(200).json(user);
};
const createUser = async (req, res) => {
  const data = parseOrThrow(createUserSchema, req.body, 'Invalid request body');
  const user = await usersService.createUser(data);
  res.status(201).location(`/api/users/${user.id}`).json(user);
};
const updateUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, 'Invalid user id');
  const data = parseOrThrow(updateUserSchema, req.body, 'Invalid request body');
  res.status(200).json(await usersService.updateUser(id, data));
};
const deleteUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, 'Invalid user id');
  await usersService.deleteUser(id);
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
