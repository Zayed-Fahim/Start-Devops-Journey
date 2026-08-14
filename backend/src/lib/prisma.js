const { PrismaClient } = require("@prisma/client");
const env = require("./env");

// ONE PrismaClient for the whole process. Every instance opens its own
// connection pool, so constructing a client per request exhausts Postgres'
// max_connections (100 by default) under very little load, and the symptom --
// "sorry, too many clients already" -- points at the database rather than at
// the code that caused it.
const prisma = new PrismaClient({
  log:
    env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

module.exports = prisma;
