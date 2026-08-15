const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const logger = require('../lib/logger');

const ensureSuperAdmin = async () => {
  const email = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    logger.debug('super admin bootstrap skipped: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD unset');
    return { status: 'unconfigured' };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    logger.info({ email }, 'super admin already exists, skipping creation');
    return { status: 'exists' };
  }

  const role = await prisma.accessRole.findUnique({
    where: { name: env.SUPER_ADMIN_ROLE },
    select: { id: true },
  });

  if (!role) {
    logger.warn(
      { role: env.SUPER_ADMIN_ROLE },
      'super admin role not found, creating the account without a role',
    );
  }

  const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    const created = await prisma.user.create({
      data: {
        name: env.SUPER_ADMIN_NAME,
        email,
        password: hashed,
        status: 'ACTIVE',
        roleId: role?.id ?? null,
      },
      select: { id: true },
    });
    logger.info({ email, role: env.SUPER_ADMIN_ROLE }, 'super admin created from environment');
    return { status: 'created', id: created.id };
  } catch (error) {
    if (error.code === 'P2002') {
      logger.info({ email }, 'super admin was created concurrently, skipping');
      return { status: 'exists' };
    }
    throw error;
  }
};

module.exports = { ensureSuperAdmin };
