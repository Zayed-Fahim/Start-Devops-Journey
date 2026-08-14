const rbac = require('../services/rbac.service');
const audit = require('../services/audit.service');
const { HttpError, notFound, conflict } = require('../lib/httpError');
const { parseOrThrow } = require('../validation/users.validation');
const {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
} = require('../validation/roles.validation');

const requestContext = (req) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ip: req.ip ?? undefined,
});

const unknownPermissions = (missing) =>
  new HttpError(
    400,
    'VALIDATION_ERROR',
    'Unknown permissions',
    missing.map((key) => ({ field: 'permissions', message: `Unknown permission: ${key}` })),
  );

const listPermissions = async (_req, res) => {
  res.status(200).json({ data: await rbac.listPermissions() });
};

const listRoles = async (_req, res) => {
  res.status(200).json({ data: await rbac.listRoles() });
};

const getRole = async (req, res) => {
  const { id } = parseOrThrow(roleIdParamSchema, req.params, 'Invalid role id');
  const role = await rbac.getRole(id);
  if (!role) throw notFound(`No role found with id ${id}`);
  res.status(200).json(role);
};

const createRole = async (req, res) => {
  const data = parseOrThrow(createRoleSchema, req.body, 'Invalid request body');
  const result = await rbac.createRole(data);
  if (result.missing) throw unknownPermissions(result.missing);

  await audit.record({
    actor: { id: req.user.id },
    action: audit.AUDIT_ACTIONS.ROLE_CREATED,
    category: 'CREATE',
    summary: `created role ${result.role.name} with ${result.role.permissions.length} permission(s)`,
    target: { type: 'role', id: result.role.id, label: result.role.name },
    context: requestContext(req),
  });

  res.status(201).location(`/api/roles/${result.role.id}`).json(result.role);
};

const updateRole = async (req, res) => {
  const { id } = parseOrThrow(roleIdParamSchema, req.params, 'Invalid role id');
  const data = parseOrThrow(updateRoleSchema, req.body, 'Invalid request body');

  const existing = await rbac.getRole(id);
  if (!existing) throw notFound(`No role found with id ${id}`);

  if (existing.isSystem && (data.name !== undefined || data.description !== undefined)) {
    throw new HttpError(400, 'SYSTEM_ROLE', 'System roles cannot be renamed');
  }

  let role = existing;

  if (data.name !== undefined || data.description !== undefined) {
    role = await rbac.updateRoleDetails(id, data);
  }

  if (data.permissions !== undefined) {
    if (await rbac.wouldOrphanRoleManagement(id, data.permissions)) {
      throw new HttpError(
        400,
        'LAST_ROLE_MANAGER',
        'This is the only role that can manage roles. Removing that permission would lock everyone out.',
      );
    }

    if (req.userRoleId === id && !data.permissions.includes(rbac.MANAGE_KEY)) {
      throw new HttpError(
        400,
        'SELF_LOCKOUT',
        'You cannot remove role management from your own role. Ask another administrator.',
      );
    }

    const result = await rbac.updateRolePermissions(id, data.permissions);
    if (result.missing) throw unknownPermissions(result.missing);
    role = result.role;
  }

  await audit.record({
    actor: { id: req.user.id },
    action: audit.AUDIT_ACTIONS.ROLE_UPDATED,
    category: 'SECURITY',
    summary: `updated role ${role.name}: ${role.permissions.length} permission(s)`,
    target: { type: 'role', id: role.id, label: role.name },
    context: requestContext(req),
  });

  res.status(200).json(role);
};

const deleteRole = async (req, res) => {
  const { id } = parseOrThrow(roleIdParamSchema, req.params, 'Invalid role id');

  const existing = await rbac.getRole(id);
  if (!existing) throw notFound(`No role found with id ${id}`);
  if (existing.isSystem) {
    throw new HttpError(400, 'SYSTEM_ROLE', 'System roles cannot be deleted');
  }

  const roles = await rbac.listRoles();
  const inUse = roles.find((role) => role.id === id)?.userCount ?? 0;
  if (inUse > 0) {
    throw conflict(`This role is assigned to ${inUse} user(s). Reassign them first.`);
  }

  const deleted = await rbac.deleteRole(id);

  await audit.record({
    actor: { id: req.user.id },
    action: audit.AUDIT_ACTIONS.ROLE_DELETED,
    category: 'DELETE',
    summary: `deleted role ${deleted.name}`,
    target: { type: 'role', id: deleted.id, label: deleted.name },
    context: requestContext(req),
  });

  res.status(204).end();
};

module.exports = { listPermissions, listRoles, getRole, createRole, updateRole, deleteRole };
