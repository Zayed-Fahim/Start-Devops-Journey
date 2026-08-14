const pino = require('pino');
const env = require('./env');

const SECRET_KEYS = [
  'password',
  'currentPassword',
  'newPassword',
  'tokenHash',
  'accessToken',
  'refreshToken',
  'csrfToken',
  'token',
  'DATABASE_URL',
  'DIRECT_URL',
  'DB_PASSWORD',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPABASE_SECRET_KEY',
];

const redactPaths = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((key) => `*.${key}`),
  ...SECRET_KEYS.map((key) => `*.*.${key}`),
];

const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: '[redacted]' },
  base: { service: 'user-management-api' },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,service',
          messageFormat: '{msg}',
        },
      },
});

module.exports = logger;
