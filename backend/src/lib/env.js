const path = require('node:path');
const { z } = require('zod');

require('dotenv').config({ path: path.resolve(__dirname, '../..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(6543),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  SUPABASE_PROJECT_URL: z.string().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  REFRESH_GRACE_SECONDS: z.coerce.number().int().min(0).max(120).default(15),
  SESSION_MAX_PER_USER: z.coerce.number().int().min(1).max(100).default(10),
  REFRESH_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  MAX_FAILED_LOGINS: z.coerce.number().int().min(3).max(20).default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).max(72).optional(),
  SUPER_ADMIN_NAME: z.string().min(1).max(120).default('Super Admin'),
  SUPER_ADMIN_ROLE: z.string().min(1).max(64).default('ADMIN'),
});

const SESSION_POOLER_PORT = 5432;
const TRANSACTION_POOLER_PORT = 6543;

const buildDatabaseUrls = ({ DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD }) => {
  const user = encodeURIComponent(DB_USER);
  const password = encodeURIComponent(DB_PASSWORD);
  const credentials = `${user}:${password}@${DB_HOST}`;

  const timeouts = 'connect_timeout=30&pool_timeout=30';

  const pooled =
    DB_PORT === TRANSACTION_POOLER_PORT
      ? `postgresql://${credentials}:${DB_PORT}/${DB_NAME}?pgbouncer=true&connection_limit=1&${timeouts}`
      : `postgresql://${credentials}:${DB_PORT}/${DB_NAME}?${timeouts}`;

  const direct = `postgresql://${credentials}:${SESSION_POOLER_PORT}/${DB_NAME}?${timeouts}`;

  return { pooled, direct };
};

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:\n');
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  });
  console.error('\nSee backend/.env.example for the full list.\n');
  process.exit(1);
}

const env = parsed.data;

env.isProduction = env.NODE_ENV === 'production';

env.corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const urls = buildDatabaseUrls(env);
env.DATABASE_URL = urls.pooled;
env.DIRECT_URL = urls.direct;

process.env.DATABASE_URL = urls.pooled;
process.env.DIRECT_URL = urls.direct;

if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  console.error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
  process.exit(1);
}

module.exports = env;
