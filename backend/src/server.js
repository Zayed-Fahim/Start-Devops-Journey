const app = require('./app');
const env = require('./lib/env');
const prisma = require('./lib/prisma');

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully…`);
  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out after 10s — forcing exit.');
    process.exit(1);
  }, 10000).unref();
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Closed HTTP server and database connections.');
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
module.exports = server;
