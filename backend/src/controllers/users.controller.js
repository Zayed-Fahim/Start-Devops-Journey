const usersService = require('../services/users.service');
const audit = require('../services/audit.service');
const notifications = require('../services/notifications.service');
const { notFound } = require('../lib/httpError');
const {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  parseOrThrow,
} = require('../validation/users.validation');

const requestContext = (req) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ip: req.ip ?? undefined,
});

const changedFields = (data) => Object.keys(data).filter((key) => key !== 'password');

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

  await audit.record({
    actor: { id: req.user.id },
    action: audit.AUDIT_ACTIONS.USER_CREATED,
    category: 'CREATE',
    summary: `created user ${user.name} with role ${user.role}`,
    target: { type: 'user', id: user.id, label: user.email },
    context: requestContext(req),
  });

  res.status(201).location(`/api/users/${user.id}`).json(user);
};

const updateUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, 'Invalid user id');
  const data = parseOrThrow(updateUserSchema, req.body, 'Invalid request body');
  const user = await usersService.updateUser(id, data);

  const fields = changedFields(data);
  const passwordChanged = data.password !== undefined;
  const summary = passwordChanged
    ? `reset the password for ${user.name}`
    : `updated ${fields.join(', ') || 'details'} for ${user.name}`;

  await audit.record({
    actor: { id: req.user.id },
    action: audit.AUDIT_ACTIONS.USER_UPDATED,
    category: passwordChanged ? 'SECURITY' : 'UPDATE',
    summary,
    target: { type: 'user', id: user.id, label: user.email },
    context: requestContext(req),
  });

  if (user.id !== req.user.id) {
    await notifications.notify({
      userId: user.id,
      title: passwordChanged ? 'Your password was reset' : 'Your account was updated',
      body: passwordChanged
        ? 'An administrator reset your password. Sign in again if you are signed out.'
        : `An administrator updated ${fields.join(', ') || 'your details'}.`,
      href: '/settings',
      category: passwordChanged ? 'SECURITY' : 'UPDATE',
    });
  }

  res.status(200).json(user);
};

const deleteUser = async (req, res) => {
  const { id } = parseOrThrow(userIdParamSchema, req.params, 'Invalid user id');
  const deleted = await usersService.deleteUser(id);

  await audit.record({
    actor: { id: req.user.id },
    action: audit.AUDIT_ACTIONS.USER_DELETED,
    category: 'DELETE',
    summary: `deleted user ${deleted.name}`,
    target: { type: 'user', id: deleted.id, label: deleted.email },
    context: requestContext(req),
  });

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
