const { spawn } = require('node:child_process');
const env = require('../src/lib/env');

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('usage: node scripts/with-db-url.js <command> [args...]');
  process.exit(1);
}

/**
 * Schema-engine commands must never reach the transaction pooler.
 *
 * The engine takes a session-scoped advisory lock and runs DDL inside a
 * transaction. The transaction pooler on 6543 can hold neither, and Prisma does
 * not time out or error when it cannot acquire the lock — it simply blocks
 * forever, which looks like a frozen `pnpm dev`. Forcing every URL to the
 * session pooler for these commands turns that silent hang into a normal run.
 */
const SCHEMA_ENGINE_COMMANDS = new Set(['migrate', 'db']);
const isSchemaCommand = args.some((arg) => SCHEMA_ENGINE_COMMANDS.has(arg));

const portOf = (url) => Number(url.match(/:(\d+)\//)?.[1]);

if (isSchemaCommand && portOf(env.DIRECT_URL) === 6543) {
  console.error(
    [
      '',
      'Refusing to run a schema-engine command against the transaction pooler.',
      '',
      `  DIRECT_URL resolves to port ${portOf(env.DIRECT_URL)}, but migrations need the`,
      '  session pooler (5432). Prisma would hang indefinitely rather than fail.',
      '',
      '  Check DB_HOST/DB_PORT in backend/.env.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: isSchemaCommand ? env.DIRECT_URL : env.DATABASE_URL,
    DIRECT_URL: env.DIRECT_URL,
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
