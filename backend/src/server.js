const app = require("./app");
const env = require("./lib/env");
const prisma = require("./lib/prisma");

const server = app.listen(env.PORT, "0.0.0.0", () => {
  // "0.0.0.0", not the default. Inside a container, binding to 127.0.0.1 means
  // the process is reachable only from within that container -- the published
  // port maps to the container's external interface, so requests from the host
  // arrive and find nothing listening. The symptom is a connection reset on
  // localhost:3001 while the logs cheerfully say the server started.
  console.log(`API listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});

/**
 * Graceful shutdown.
 *
 * `docker compose stop` sends SIGTERM and waits 10 seconds before SIGKILL.
 * With no handler, Node ignores SIGTERM's intent and dies instantly: in-flight
 * requests are severed mid-response and the Postgres connection pool is left
 * for the server to time out on its own.
 *
 * Here: stop accepting new connections, let running requests finish, close the
 * pool, exit 0.
 */
let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully…`);

  // A hard deadline, so a single stuck request cannot hold the container open
  // until Docker resorts to SIGKILL. .unref() lets the process exit early if
  // everything closes cleanly before the timer fires.
  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out after 10s — forcing exit.");
    process.exit(1);
  }, 10_000).unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Closed HTTP server and database connections.");
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// A promise rejection nobody caught leaves the process in an unknown state.
// Log it and exit non-zero so the restart policy can replace the container,
// rather than letting it limp along serving errors.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

module.exports = server;
