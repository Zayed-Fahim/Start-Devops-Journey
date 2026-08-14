const path = require('node:path');
const { z } = require('zod');

require('dotenv').config({ path: path.resolve(__dirname, '../..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  MAX_FAILED_LOGINS: z.coerce.number().int().min(3).max(20).default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
});

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

if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  console.error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
  process.exit(1);
}

module.exports = env;
