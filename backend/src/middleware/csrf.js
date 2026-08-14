const { HttpError } = require('../lib/httpError');
const { timingSafeEqual } = require('../lib/tokens');
const { CSRF_COOKIE } = require('../lib/cookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

const verifyCsrf = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    next(new HttpError(403, 'CSRF_TOKEN_INVALID', 'Missing or invalid CSRF token'));
    return;
  }

  next();
};

module.exports = { verifyCsrf, CSRF_HEADER };
