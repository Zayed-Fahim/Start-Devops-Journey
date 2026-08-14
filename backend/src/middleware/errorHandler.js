const { ZodError } = require("zod");
const { HttpError } = require("../lib/httpError");
const { formatIssues } = require("../validation/users.validation");
const env = require("../lib/env");

/**
 * ONE error shape for every failure, everywhere:
 *
 *   { "error": { "code": "...", "message": "...", "details": [...] } }
 *
 * Why it matters: the frontend writes a single error handler and a single
 * field-error mapper. Ad-hoc shapes mean the UI grows a special case per
 * endpoint and eventually gives up and shows "Something went wrong" for
 * everything -- which is how a validation message the user needed becomes
 * invisible.
 *
 * Express identifies error middleware by ARITY: it must take exactly four
 * arguments. Drop `next` because it looks unused and this silently stops being
 * error middleware and starts being a normal handler that never runs.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Once headers are out the door the response cannot be rewritten. Hand back
  // to Express's default handler, which will destroy the socket.
  if (res.headersSent) return next(err);

  const send = (status, code, message, details) =>
    res.status(status).json({
      error: { code, message, ...(details ? { details } : {}) },
    });

  // --- Errors we raised deliberately ---------------------------------------
  if (err instanceof HttpError) {
    return send(err.status, err.code, err.message, err.details);
  }

  // --- A zod schema that was parsed outside parseOrThrow --------------------
  if (err instanceof ZodError) {
    return send(400, "VALIDATION_ERROR", "Invalid request", formatIssues(err));
  }

  // --- Malformed JSON body -------------------------------------------------
  // express.json() throws a SyntaxError for `{"name":`. Left alone it becomes
  // a 500, blaming the server for the client's broken payload.
  if (err.type === "entity.parse.failed") {
    return send(400, "INVALID_JSON", "Request body is not valid JSON");
  }
  if (err.type === "entity.too.large") {
    return send(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }

  // --- Prisma cannot reach the database ------------------------------------
  // Matched by NAME, not by err.code. Only PrismaClientKnownRequestError
  // carries a `.code` like P2002; a connection failure throws
  // PrismaClientInitializationError, which has no `.code` at all — so a
  // `case "P1001"` in the switch below can never match and every
  // database-down request would fall through to a generic 500.
  //
  // 503, not 500: nothing is wrong with this code, a dependency is
  // unavailable, and a retry may well succeed. That distinction is what lets
  // the frontend say "retry" instead of "this is broken".
  if (
    err.name === "PrismaClientInitializationError" ||
    err.name === "PrismaClientRustPanicError"
  ) {
    console.error("[error] database unreachable:", err.message);
    return send(503, "DATABASE_UNAVAILABLE", "Database is unavailable");
  }

  // --- Prisma known request errors -----------------------------------------
  switch (err.code) {
    case "P2002": {
      // Unique constraint. The database caught it, which is the only place it
      // CAN be caught reliably -- an application-level "does this email exist?"
      // check has a race window between the SELECT and the INSERT that two
      // concurrent requests will eventually find.
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target
        : [err.meta?.target].filter(Boolean);
      const field = target.includes("email") ? "email" : target[0] || "field";
      return send(
        409,
        "DUPLICATE_EMAIL",
        `A user with this ${field} already exists`,
        [{ field, message: `This ${field} is already taken` }]
      );
    }
    case "P2025":
      // "Record to update/delete does not exist."
      return send(404, "NOT_FOUND", "Resource not found");
    case "P2023":
    case "P2000":
      return send(400, "VALIDATION_ERROR", "Invalid value for a field");
    default:
      break;
  }

  // --- Anything we did not anticipate --------------------------------------
  // Log the full error server-side; return a generic message to the client.
  // Stack traces and driver messages leak table names, file paths and library
  // versions -- free reconnaissance for an attacker. In development the real
  // message is included, because there the only reader is you.
  console.error("[error] unhandled:", err);

  return send(
    500,
    "INTERNAL_ERROR",
    env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message || "An unexpected error occurred"
  );
};

module.exports = errorHandler;
