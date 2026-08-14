/**
 * An error that already knows which HTTP status it deserves.
 *
 * The alternative -- returning `res.status(404).json(...)` from deep inside a
 * service -- couples business logic to the transport and makes the same
 * function unusable from a CLI, a queue worker, or a test. Throwing lets the
 * service stay transport-agnostic and lets ONE middleware decide how errors
 * are rendered.
 */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, HttpError);
  }
}

const badRequest = (message = "Invalid request", details) =>
  new HttpError(400, "VALIDATION_ERROR", message, details);

const notFound = (message = "Resource not found") =>
  new HttpError(404, "NOT_FOUND", message);

const conflict = (message = "Resource already exists", details) =>
  new HttpError(409, "CONFLICT", message, details);

module.exports = { HttpError, badRequest, notFound, conflict };
