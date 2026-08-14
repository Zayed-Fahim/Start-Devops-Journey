const app = require('./app');
const env = require('./lib/env');
const prisma = require('./lib/prisma');
const logger = require('./lib/logger');

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
});
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down gracefully');
  const forceExit = setTimeout(() => {
    logger.fatal('shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10000).unref();
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('closed http server and database connections');
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'error during shutdown');
      process.exit(1);
    }
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled promise rejection');
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception');
  process.exit(1);
});
module.exports = server;
