const { notFound } = require("../lib/httpError");

/**
 * Catches any request that matched no route and turns it into the SAME error
 * envelope as everything else.
 *
 * Without this, Express serves its own HTML error page. A frontend that calls
 * a mistyped URL then gets `<!DOCTYPE html>` back, `response.json()` throws
 * "Unexpected token <", and the actual problem -- a typo in the path -- is
 * three layers away from the error message you are reading.
 *
 * Registered after every route, before the error handler.
 */
const notFoundHandler = (req, _res, next) => {
  next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
