const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const env = require('./env');

/**
 * Prisma 7 drops the Rust query engine, so the connection is now owned by
 * node-postgres through a driver adapter.
 *
 * Built from the DB_* parts rather than DATABASE_URL because that URL carries
 * Prisma-only query params (pgbouncer, connection_limit, pool_timeout) that pg
 * would forward to Postgres as unrecognised startup parameters.
 *
 * No pgbouncer flag is needed any more: the adapter only sends named prepared
 * statements when a statementNameGenerator is supplied, and we supply none, so
 * every statement is unnamed and safe on the transaction pooler.
 */
const adapter = new PrismaPg({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: 30000,
});

const prisma = new PrismaClient({
  adapter,
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
      '  pnpm run db:generate',
      '',
      'Prisma 7 generates into node_modules/@prisma/client. If the models are',
      'still missing afterwards, remove node_modules/.prisma — a directory left',
      'over from Prisma 6 shadows the real client and generate will not clear it.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

module.exports = prisma;
