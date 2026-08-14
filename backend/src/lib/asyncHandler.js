/**
 * Express 4 does not understand promises.
 *
 * If an `async` route handler rejects, Express never sees the error: it is an
 * unhandled promise rejection, the `next(err)` chain is never entered, the
 * error middleware never runs, and the REQUEST HANGS until the client times
 * out. There is no stack trace in the response and often none in the log --
 * which is why this bug usually gets diagnosed as "the network is flaky".
 *
 * Wrapping every async handler routes rejections into Express's error channel,
 * where the centralised error middleware can turn them into a proper response.
 *
 * (Express 5 does this natively. This project is on Express 4.)
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
