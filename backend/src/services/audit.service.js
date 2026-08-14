const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const SYSTEM_ACTOR = 'System';

const AUDIT_ACTIONS = Object.freeze({
  USER_REGISTERED: 'user.registered',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  AUTH_SESSION_REUSE: 'auth.session_reuse_detected',
  SESSION_REVOKED: 'session.revoked',
  SESSIONS_REVOKED_ALL: 'session.revoked_others',
  PASSWORD_CHANGED: 'account.password_changed',
  PASSWORD_CHANGE_FAILED: 'account.password_change_failed',
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  TEAM_CREATED: 'team.created',
  TEAM_UPDATED: 'team.updated',
  TEAM_DELETED: 'team.deleted',
  TEAM_MEMBER_ADDED: 'team.member_added',
  TEAM_MEMBER_REMOVED: 'team.member_removed',
  TEAM_LEAD_CHANGED: 'team.lead_changed',
});

const AUDIT_LOG_SELECT = Object.freeze({
  id: true,
  actorId: true,
  actorLabel: true,
  action: true,
  category: true,
  summary: true,
  targetType: true,
  targetId: true,
  targetLabel: true,
  ip: true,
  createdAt: true,
});

const resolveActorLabel = async (actor) => {
  if (actor?.name) return actor.name;
  if (actor?.email) return actor.email;
  if (!actor?.id) return SYSTEM_ACTOR;

  const found = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { name: true, email: true },
  });
  return found?.name ?? found?.email ?? SYSTEM_ACTOR;
};

const buildEntry = ({ actor, actorLabel, action, category, summary, target, context }) => ({
  actorId: actor?.id ?? null,
  actorLabel: (actorLabel ?? actor?.name ?? actor?.email ?? SYSTEM_ACTOR).slice(0, 160),
  action,
  category,
  summary: summary.slice(0, 500),
  targetType: target?.type ?? null,
  targetId: target?.id ?? null,
  targetLabel: target?.label?.slice(0, 255) ?? null,
  ip: context?.ip?.slice(0, 64) ?? null,
  userAgent: context?.userAgent?.slice(0, 255) ?? null,
});

const record = async (input) => {
  try {
    const actorLabel = await resolveActorLabel(input.actor);
    await prisma.auditLog.create({ data: buildEntry({ ...input, actorLabel }) });
  } catch (error) {
    logger.error({ err: error, action: input.action }, 'failed to write audit log');
  }
};

const listAuditLogs = async ({ page, limit, search, category, action, from, to }) => {
  const where = {};

  if (category) where.category = category;
  if (action) where.action = action;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  if (search) {
    const term = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    where.OR = [
      { actorLabel: { contains: term, mode: 'insensitive' } },
      { summary: { contains: term, mode: 'insensitive' } },
      { targetLabel: { contains: term, mode: 'insensitive' } },
      { action: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      select: AUDIT_LOG_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getAuditStats = async () => {
  const groups = await prisma.auditLog.groupBy({
    by: ['category'],
    _count: { _all: true },
  });

  const byCategory = { CREATE: 0, UPDATE: 0, DELETE: 0, SECURITY: 0 };
  groups.forEach((row) => {
    byCategory[row.category] = row._count._all;
  });

  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
  return { total, byCategory };
};

module.exports = {
  AUDIT_ACTIONS,
  AUDIT_LOG_SELECT,
  SYSTEM_ACTOR,
  buildEntry,
  record,
  listAuditLogs,
  getAuditStats,
};
