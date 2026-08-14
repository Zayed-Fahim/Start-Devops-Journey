const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();
router.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
  });
});
router.get('/readyz', async (_req, res) => {
  const startedAt = process.hrtime.bigint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    res.status(200).json({
      status: 'ready',
      checks: { database: { status: 'up', latencyMs: Number(latencyMs.toFixed(2)) } },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[readyz] database check failed:', error.message);
    res.status(503).json({
      status: 'not_ready',
      checks: { database: { status: 'down' } },
      timestamp: new Date().toISOString(),
    });
  }
});
module.exports = router;
