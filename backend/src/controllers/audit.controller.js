const auditService = require('../services/audit.service');
const { parseOrThrow } = require('../validation/users.validation');
const { listAuditLogsQuerySchema } = require('../validation/audit.validation');

const listAuditLogs = async (req, res) => {
  const query = parseOrThrow(listAuditLogsQuerySchema, req.query, 'Invalid query parameters');
  res.status(200).json(await auditService.listAuditLogs(query));
};

const getAuditStats = async (_req, res) => {
  res.status(200).json(await auditService.getAuditStats());
};

module.exports = { listAuditLogs, getAuditStats };
