const crypto = require('node:crypto');
const pinoHttp = require('pino-http');
const logger = require('../lib/logger');

const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing || crypto.randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  autoLogging: {
    ignore: (req) => req.url === '/healthz' || req.url === '/readyz',
  },
  customLogLevel: (req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) return 'warn';
    if (res.statusCode >= 400) return 'info';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

module.exports = requestLogger;
