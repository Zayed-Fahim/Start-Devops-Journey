const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const REQUIRED_MODELS = [
  'user',
  'refreshToken',
  'auditLog',
  'team',
  'teamMember',
  'notification',
  'document',
  'supportRequest',
];

const missing = REQUIRED_MODELS.filter((model) => typeof prisma[model] !== 'object');

if (missing.length > 0) {
  console.error(
    [
      '',
      `The generated Prisma client is missing: ${missing.join(', ')}.`,
      '',
      'It was generated from an older schema. Run:',
      '',
      '  rm -rf node_modules/.prisma && pnpm run db:generate',
      '',
      'A stale node_modules/.prisma directory left over from a previous package',
      'manager shadows the real client, and prisma generate does not overwrite it.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

module.exports = prisma;
