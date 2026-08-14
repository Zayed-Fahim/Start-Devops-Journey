const crypto = require('crypto');
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
  const id = crypto.randomUUID();

  const result = await rbac.createRole(
    { ...data, id },
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.ROLE_CREATED,
      category: 'CREATE',
      summary: `created role ${data.name} with ${data.permissions.length} permission(s)`,
      target: { type: 'role', id, label: data.name },
      context: requestContext(req),
    }),
  );
  if (result.missing) throw unknownPermissions(result.missing);

  res.status(201).location(`/api/roles/${result.role.id}`).json(result.role);
};

const updateRole = async (req, res) => {
  const { id } = parseOrThrow(roleIdParamSchema, req.params, 'Invalid role id');
  const data = parseOrThrow(updateRoleSchema, req.body, 'Invalid request body');

  const { role: existing, otherManagers } = await rbac.loadRoleForUpdate(id);
  if (!existing) throw notFound(`No role found with id ${id}`);

  if (existing.isSystem && (data.name !== undefined || data.description !== undefined)) {
    throw new HttpError(400, 'SYSTEM_ROLE', 'System roles cannot be renamed');
  }

  let role = existing;

  if (data.name !== undefined || data.description !== undefined) {
    role = await rbac.updateRoleDetails(id, data);
  }

  if (data.permissions !== undefined) {
    if (rbac.wouldOrphanRoleManagement(data.permissions, otherManagers)) {
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

    const result = await rbac.updateRolePermissions(
      id,
      data.permissions,
      audit.buildEntry({
        actor: req.user,
        action: audit.AUDIT_ACTIONS.ROLE_UPDATED,
        category: 'SECURITY',
        summary: `updated role ${role.name}: ${data.permissions.length} permission(s)`,
        target: { type: 'role', id, label: role.name },
        context: requestContext(req),
      }),
    );
    if (result.missing) throw unknownPermissions(result.missing);

    res.status(200).json(result.role);
    return;
  }

  await audit.record({
    actor: req.user,
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

  const { role: existing, userCount } = await rbac.loadRoleForDelete(id);
  if (!existing) throw notFound(`No role found with id ${id}`);
  if (existing.isSystem) {
    throw new HttpError(400, 'SYSTEM_ROLE', 'System roles cannot be deleted');
  }
  if (userCount > 0) {
    throw conflict(`This role is assigned to ${userCount} user(s). Reassign them first.`);
  }

  await rbac.deleteRole(
    id,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.ROLE_DELETED,
      category: 'DELETE',
      summary: `deleted role ${existing.name}`,
      target: { type: 'role', id, label: existing.name },
      context: requestContext(req),
    }),
  );

  res.status(204).end();
};

module.exports = { listPermissions, listRoles, getRole, createRole, updateRole, deleteRole };
