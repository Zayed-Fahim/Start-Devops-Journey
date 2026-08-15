const { milliseconds } = require('date-fns');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const logger = require('../lib/logger');

const activeFamiliesFor = async (userId) => {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { familyId: true },
    orderBy: { createdAt: 'desc' },
  });

  const ordered = [];
  const seen = new Set();
  tokens.forEach(({ familyId }) => {
    if (seen.has(familyId)) return;
    seen.add(familyId);
    ordered.push(familyId);
  });

  return ordered;
};

const enforceSessionCap = async (userId) => {
  const families = await activeFamiliesFor(userId);
  const excess = families.slice(env.SESSION_MAX_PER_USER);

  if (excess.length === 0) return 0;

  await prisma.refreshToken.updateMany({
    where: { userId, familyId: { in: excess }, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  logger.info(
    { userId, revokedFamilies: excess.length, cap: env.SESSION_MAX_PER_USER },
    'session cap enforced, oldest sessions revoked',
  );

  return excess.length;
};

const pruneRefreshTokens = async () => {
  const now = new Date();
  const retentionCutoff = new Date(
    now.getTime() - milliseconds({ days: env.REFRESH_RETENTION_DAYS }),
  );

  const expired = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  const revoked = await prisma.refreshToken.deleteMany({
    where: { revokedAt: { lt: retentionCutoff } },
  });

  return { expiredDeleted: expired.count, revokedDeleted: revoked.count };
};

const capAllUsers = async () => {
  const users = await prisma.user.findMany({ select: { id: true } });
  let revokedFamilies = 0;

  await users.reduce(
    (chain, user) =>
      chain.then(async () => {
        revokedFamilies += await enforceSessionCap(user.id);
      }),
    Promise.resolve(),
  );

  return { revokedFamilies };
};

module.exports = { activeFamiliesFor, enforceSessionCap, pruneRefreshTokens, capAllUsers };
