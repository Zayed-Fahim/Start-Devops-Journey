const { milliseconds } = require('date-fns');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const { HttpError, conflict } = require('../lib/httpError');
const logger = require('../lib/logger');
const audit = require('./audit.service');
const { toPublicUser } = require('./users.service');
const { enforceSessionCap } = require('./sessionMaintenance.service');
const {
  signAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  createCsrfToken,
} = require('../lib/tokens');

const PUBLIC_USER_SELECT = Object.freeze({
  id: true,
  name: true,
  email: true,
  status: true,
  country: true,
  timezone: true,
  timeFormat: true,
  createdAt: true,
  updatedAt: true,
  roleId: true,
  roleRef: { select: { name: true } },
});

const invalidCredentials = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-for-timing-equalisation', 10);

const DEFAULT_ROLE_NAME = 'USER';

const issueSession = async (user, { familyId, context }) => {
  const refreshToken = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId: familyId ?? crypto.randomUUID(),
      expiresAt: refreshExpiryDate(),
      userAgent: context?.userAgent?.slice(0, 255) ?? null,
      ip: context?.ip?.slice(0, 64) ?? null,
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    csrfToken: createCsrfToken(),
  };
};

const register = async ({ name, email, password }, context) => {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing)
    throw conflict('A user with this email already exists', [
      { field: 'email', message: 'This email is already taken' },
    ]);

  const defaultRole = await prisma.accessRole.findUnique({
    where: { name: DEFAULT_ROLE_NAME },
    select: { id: true },
  });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, env.BCRYPT_ROUNDS),
      status: 'ACTIVE',
      roleId: defaultRole?.id ?? null,
    },
    select: PUBLIC_USER_SELECT,
  });

  await audit.record({
    actor: user,
    action: audit.AUDIT_ACTIONS.USER_REGISTERED,
    category: 'CREATE',
    summary: 'created an account',
    target: { type: 'user', id: user.id, label: user.email },
    context,
  });

  const publicUser = toPublicUser(user);
  const tokens = await issueSession(publicUser, { context });
  await enforceSessionCap(user.id);
  return { user: publicUser, tokens };
};

const login = async ({ email, password }, context) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(
      423,
      'ACCOUNT_LOCKED',
      'Account temporarily locked after too many failed attempts. Try again later.',
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= env.MAX_FAILED_LOGINS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failedLoginCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + milliseconds({ minutes: env.LOCKOUT_MINUTES }))
          : user.lockedUntil,
      },
    });

    await audit.record({
      actor: { id: user.id, name: user.name },
      action: shouldLock
        ? audit.AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED
        : audit.AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      category: 'SECURITY',
      summary: shouldLock
        ? `was locked out after ${env.MAX_FAILED_LOGINS} failed sign-in attempts`
        : 'failed a sign-in attempt',
      target: { type: 'user', id: user.id, label: user.email },
      context,
    });

    throw invalidCredentials();
  }

  if (user.status !== 'ACTIVE') {
    throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account is not active');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    select: PUBLIC_USER_SELECT,
  });

  await audit.record({
    actor: updated,
    action: audit.AUDIT_ACTIONS.AUTH_LOGIN,
    category: 'SECURITY',
    summary: 'signed in',
    target: { type: 'user', id: updated.id, label: updated.email },
    context,
  });

  const publicUser = toPublicUser(updated);
  const tokens = await issueSession(publicUser, { context });
  await enforceSessionCap(updated.id);
  return { user: publicUser, tokens };
};

const inheritDeviceContext = (stored, context) => ({
  userAgent: stored.userAgent ?? context?.userAgent,
  ip: stored.ip ?? context?.ip,
});

const rotateRefreshToken = async (presentedToken, context) => {
  if (!presentedToken) throw new HttpError(401, 'NO_SESSION', 'No refresh token provided');

  const tokenHash = hashRefreshToken(presentedToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: PUBLIC_USER_SELECT } },
  });

  if (!stored) throw new HttpError(401, 'INVALID_SESSION', 'Session is no longer valid');

  if (stored.revokedAt) {
    const revokedMsAgo = Date.now() - stored.revokedAt.getTime();
    const withinGrace = revokedMsAgo <= env.REFRESH_GRACE_SECONDS * 1000;

    const familyStillActive = withinGrace
      ? await prisma.refreshToken.count({
          where: { familyId: stored.familyId, revokedAt: null, expiresAt: { gt: new Date() } },
        })
      : 0;

    if (!withinGrace || familyStillActive === 0) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await audit.record({
        actor: stored.user,
        action: audit.AUDIT_ACTIONS.AUTH_SESSION_REUSE,
        category: 'SECURITY',
        summary: 'triggered refresh token reuse detection; all sessions revoked',
        target: { type: 'user', id: stored.user.id, label: stored.user.email },
        context,
      });

      throw new HttpError(
        401,
        'SESSION_REUSE_DETECTED',
        'Session invalidated. Please sign in again.',
      );
    }

    logger.debug(
      { userId: stored.user.id, revokedMsAgo },
      'refresh replay inside grace window, treating as a concurrent request',
    );

    const graceTokens = await issueSession(toPublicUser(stored.user), {
      familyId: stored.familyId,
      context: inheritDeviceContext(stored, context),
    });
    return { user: toPublicUser(stored.user), tokens: graceTokens };
  }

  if (stored.expiresAt <= new Date()) {
    throw new HttpError(401, 'SESSION_EXPIRED', 'Session expired. Please sign in again.');
  }

  if (stored.user.status !== 'ACTIVE') {
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account is not active');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueSession(toPublicUser(stored.user), {
    familyId: stored.familyId,
    context: inheritDeviceContext(stored, context),
  });
  return { user: toPublicUser(stored.user), tokens };
};

const logout = async (presentedToken, context) => {
  if (!presentedToken) return;

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(presentedToken) },
    select: { familyId: true, userId: true },
  });

  if (!stored) return;

  await prisma.refreshToken.updateMany({
    where: { familyId: stored.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await audit.record({
    actor: { id: stored.userId },
    action: audit.AUDIT_ACTIONS.AUTH_LOGOUT,
    category: 'SECURITY',
    summary: 'signed out',
    context,
  });
};

const getSessionUser = async (userId) =>
  toPublicUser(await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT }));

module.exports = {
  PUBLIC_USER_SELECT,
  register,
  login,
  rotateRefreshToken,
  logout,
  getSessionUser,
};
