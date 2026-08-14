const { spawn } = require('node:child_process');
const env = require('../src/lib/env');

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('usage: node scripts/with-db-url.js <command> [args...]');
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: env.DATABASE_URL,
    DIRECT_URL: env.DIRECT_URL,
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
