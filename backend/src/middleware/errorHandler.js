const { ZodError } = require('zod');
const { HttpError } = require('../lib/httpError');
const { formatIssues } = require('../validation/users.validation');
const env = require('../lib/env');
const logger = require('../lib/logger');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const send = (status, code, message, details) =>
    res.status(status).json({
      error: { code, message, ...(details ? { details } : {}) },
    });
  if (err instanceof HttpError) {
    return send(err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    return send(400, 'VALIDATION_ERROR', 'Invalid request', formatIssues(err));
  }
  if (err.type === 'entity.parse.failed') {
    return send(400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
  if (err.type === 'entity.too.large') {
    return send(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  const unreachableByName =
    err.name === 'PrismaClientInitializationError' || err.name === 'PrismaClientRustPanicError';
  const unreachableByCode = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'].includes(err.code);

  if (unreachableByName || unreachableByCode) {
    logger.error({ err, reqId: req.id }, 'database unreachable');
    return send(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
  }

  switch (err.code) {
    case 'P2002': {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target
        : [err.meta?.target].filter(Boolean);

      if (target.includes('email')) {
        return send(409, 'DUPLICATE_EMAIL', 'A user with this email already exists', [
          { field: 'email', message: 'This email is already taken' },
        ]);
      }

      const field = target[0] || 'value';
      return send(409, 'DUPLICATE_VALUE', `That ${field} is already taken`, [
        { field, message: `This ${field} is already taken` },
      ]);
    }
    case 'P2003':
      return send(400, 'INVALID_REFERENCE', 'A referenced record does not exist', [
        { field: err.meta?.field_name ?? 'reference', message: 'This record does not exist' },
      ]);
    case 'P2025':
      return send(404, 'NOT_FOUND', 'Resource not found');
    case 'P2023':
    case 'P2000':
      return send(400, 'VALIDATION_ERROR', 'Invalid value for a field');
    default:
      break;
  }
  logger.error({ err, reqId: req.id, method: req.method, url: req.originalUrl }, 'unhandled error');
  return send(
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'An unexpected error occurred',
  );
};
module.exports = errorHandler;
