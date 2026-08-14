const { HttpError } = require('../lib/httpError');
const { verifyAccessToken } = require('../lib/tokens');
const { ACCESS_COOKIE } = require('../lib/cookies');

const requireAuth = (req, res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (!token) {
    next(new HttpError(401, 'NOT_AUTHENTICATED', 'Authentication required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, status: payload.status };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new HttpError(401, 'TOKEN_EXPIRED', 'Access token expired'));
      return;
    }
    next(new HttpError(401, 'INVALID_TOKEN', 'Invalid access token'));
  }
};

const requireRole =
  (...allowed) =>
  (req, res, next) => {
    if (!req.user) {
      next(new HttpError(401, 'NOT_AUTHENTICATED', 'Authentication required'));
      return;
    }

    if (!allowed.includes(req.user.role)) {
      next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      return;
    }

    next();
  };

module.exports = { requireAuth, requireRole };
