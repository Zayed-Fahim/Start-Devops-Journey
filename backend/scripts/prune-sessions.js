const prisma = require('../src/lib/prisma');
const env = require('../src/lib/env');
const { pruneRefreshTokens, capAllUsers } = require('../src/services/sessionMaintenance.service');

const main = async () => {
  const before = await prisma.refreshToken.count();

  const capped = await capAllUsers();
  const pruned = await pruneRefreshTokens();

  const after = await prisma.refreshToken.count();
  const active = await prisma.refreshToken.count({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
  });

  console.log(`rows before            : ${before}`);
  console.log(
    `families revoked by cap: ${capped.revokedFamilies} (cap ${env.SESSION_MAX_PER_USER}/user)`,
  );
  console.log(`expired rows deleted   : ${pruned.expiredDeleted}`);
  console.log(
    `revoked rows deleted   : ${pruned.revokedDeleted} (older than ${env.REFRESH_RETENTION_DAYS} days)`,
  );
  console.log(`rows after             : ${after}`);
  console.log(`still active           : ${active}`);
};

main()
  .catch((error) => {
    console.error('prune failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
