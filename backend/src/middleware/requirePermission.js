const prisma = require('../lib/prisma');
const { HttpError } = require('../lib/httpError');
const rbac = require('../services/rbac.service');

const loadUserPermissions = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roleId: true },
  });
  if (!user) return [];
  return rbac.getPermissionsForRole(user.roleId);
};

const attachPermissions = async (req) => {
  if (!req.permissions) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { roleId: true },
    });
    req.userRoleId = user?.roleId ?? null;
    req.permissions = await rbac.getPermissionsForRole(req.userRoleId);
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

module.exports = { requirePermission, loadUserPermissions };
