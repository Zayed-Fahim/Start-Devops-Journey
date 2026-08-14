const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

/**
 * LIVENESS — "is this process alive?"
 *
 * Touches nothing external. Answers from memory, always fast, and a failure
 * means "restart me".
 *
 * It deliberately does NOT check the database. Conflating the two is a classic
 * outage amplifier: if liveness checked Postgres, a five-second database blip
 * would fail liveness on every backend container at once, and the orchestrator
 * would restart all of them simultaneously -- turning a brief degradation into
 * a full cold start, right when the database is already struggling.
 */
router.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
  });
});

/**
 * READINESS — "can this process actually serve traffic?"
 *
 * Runs a real query. A failure means "stop sending me requests", NOT
 * "restart me" -- the process is fine, its dependency is not, and restarting
 * would not help.
 *
 * Handled inline rather than thrown, because a dependency being down is an
 * expected operational state that must return 503, not an unhandled 500.
 */
router.get("/readyz", async (_req, res) => {
  const startedAt = process.hrtime.bigint();
  try {
    // The cheapest possible round trip that proves the connection pool works,
    // the credentials are right, and Postgres is answering.
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    res.status(200).json({
      status: "ready",
      checks: { database: { status: "up", latencyMs: Number(latencyMs.toFixed(2)) } },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // 503 Service Unavailable, and log the reason server-side. The response
    // stays vague on purpose: a health endpoint is usually reachable from more
    // places than the API, so it should not narrate your infrastructure.
    console.error("[readyz] database check failed:", error.message);
    res.status(503).json({
      status: "not_ready",
      checks: { database: { status: "down" } },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
