const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const { HttpError } = require('../lib/httpError');
const { hashRefreshToken } = require('../lib/tokens');
const { describeUserAgent } = require('../lib/userAgent');
const audit = require('./audit.service');

const listSessions = async (userId, currentToken) => {
  const currentHash = currentToken ? hashRefreshToken(currentToken) : null;

  const sessions = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      tokenHash: true,
      familyId: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const currentFamilyId = sessions.find((session) => session.tokenHash === currentHash)?.familyId;

  const byFamily = new Map();
  sessions.forEach((session) => {
    const existing = byFamily.get(session.familyId);
    if (!existing || session.createdAt > existing.createdAt)
      byFamily.set(session.familyId, session);
  });

  return [...byFamily.values()]
    .map((session) => ({
      id: session.familyId,
      device: describeUserAgent(session.userAgent),
      userAgent: session.userAgent,
      ip: session.ip,
      lastUsedAt: session.createdAt,
      expiresAt: session.expiresAt,
      current: session.familyId === currentFamilyId,
    }))
    .sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return b.lastUsedAt - a.lastUsedAt;
    });
};

const revokeSession = async (userId, familyId, currentToken, context) => {
  const currentHash = currentToken ? hashRefreshToken(currentToken) : null;

  const owned = await prisma.refreshToken.findFirst({
    where: { userId, familyId },
    select: { familyId: true, tokenHash: true },
  });

  if (!owned) throw new HttpError(404, 'NOT_FOUND', 'Session not found');

  const isCurrent = await prisma.refreshToken.count({
    where: { userId, familyId, tokenHash: currentHash ?? '__none__' },
  });

  if (isCurrent > 0) {
    throw new HttpError(
      400,
      'CANNOT_REVOKE_CURRENT',
      'Use sign out to end the session you are currently using',
    );
  }

  const { count } = await prisma.refreshToken.updateMany({
    where: { userId, familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await audit.record({
    actor: { id: userId },
    action: audit.AUDIT_ACTIONS.SESSION_REVOKED,
    category: 'SECURITY',
    summary: 'revoked another active session',
    target: { type: 'session', id: familyId },
    context,
  });

  return { revoked: count };
};

const revokeOtherSessions = async (userId, currentToken, context) => {
  const currentHash = currentToken ? hashRefreshToken(currentToken) : null;

  const current = currentHash
    ? await prisma.refreshToken.findUnique({
        where: { tokenHash: currentHash },
        select: { familyId: true },
      })
    : null;

  const { count } = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(current ? { familyId: { not: current.familyId } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  if (count > 0) {
    await audit.record({
      actor: { id: userId },
      action: audit.AUDIT_ACTIONS.SESSIONS_REVOKED_ALL,
      category: 'SECURITY',
      summary: `signed out ${count} other session${count === 1 ? '' : 's'}`,
      context,
    });
  }

  return { revoked: count };
};

const changePassword = async (userId, { currentPassword, newPassword }, currentToken, context) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, password: true },
  });

  if (!user) throw new HttpError(401, 'NOT_AUTHENTICATED', 'Authentication required');

  const matches = await bcrypt.compare(currentPassword, user.password);

  if (!matches) {
    await audit.record({
      actor: { id: user.id, name: user.name },
      action: audit.AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
      category: 'SECURITY',
      summary: 'failed a password change: current password was wrong',
      target: { type: 'user', id: user.id, label: user.email },
      context,
    });

    throw new HttpError(400, 'VALIDATION_ERROR', 'Current password is incorrect', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS) },
  });

  const { revoked } = await revokeOtherSessions(user.id, currentToken, context);

  await audit.record({
    actor: { id: user.id, name: user.name },
    action: audit.AUDIT_ACTIONS.PASSWORD_CHANGED,
    category: 'SECURITY',
    summary: 'changed their password',
    target: { type: 'user', id: user.id, label: user.email },
    context,
  });

  return { revokedSessions: revoked };
};

module.exports = { listSessions, revokeSession, revokeOtherSessions, changePassword };
