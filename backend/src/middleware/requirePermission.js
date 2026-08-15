const prisma = require('../lib/prisma');
const { HttpError } = require('../lib/httpError');

const USER_CONTEXT_SELECT = Object.freeze({
  roleId: true,
  name: true,
  email: true,
  roleRef: { select: { permissions: { select: { permission: { select: { key: true } } } } } },
});

const loadUserContext = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_CONTEXT_SELECT,
  });

  return {
    roleId: user?.roleId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    permissions: (user?.roleRef?.permissions ?? []).map((entry) => entry.permission.key).sort(),
  };
};

const loadUserPermissions = async (userId) => (await loadUserContext(userId)).permissions;

const attachPermissions = async (req) => {
  if (!req.permissions) {
    const context = await loadUserContext(req.user.id);
    req.userRoleId = context.roleId;
    req.user.name = context.name;
    req.user.email = context.email;
    req.permissions = context.permissions;
  }
  return req.permissions;
};

const requirePermission =
  (...required) =>
  async (req, _res, next) => {
    try {
      if (!req.user) {
        next(new HttpError(401, 'NOT_AUTHENTICATED', 'Authentication required'));
        return;
      }

      const granted = await attachPermissions(req);
      const missing = required.filter((key) => !granted.includes(key));

      if (missing.length > 0) {
        next(
          new HttpError(
            403,
            'FORBIDDEN',
            'You do not have permission to perform this action',
            missing.map((key) => ({ field: 'permission', message: key })),
          ),
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

module.exports = { requirePermission, loadUserContext, loadUserPermissions };
