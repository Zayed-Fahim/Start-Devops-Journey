const { notFound } = require('../lib/httpError');

const notFoundHandler = (req, _res, next) => {
  next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
module.exports = notFoundHandler;
