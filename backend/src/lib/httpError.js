class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, HttpError);
  }
}
const badRequest = (message = 'Invalid request', details = undefined) =>
  new HttpError(400, 'VALIDATION_ERROR', message, details);
const notFound = (message = 'Resource not found') => new HttpError(404, 'NOT_FOUND', message);
const conflict = (message = 'Resource already exists', details = undefined) =>
  new HttpError(409, 'CONFLICT', message, details);
const forbidden = (
  message = 'You do not have permission to perform this action',
  details = undefined,
) => new HttpError(403, 'FORBIDDEN', message, details);
module.exports = { HttpError, badRequest, notFound, conflict, forbidden };
