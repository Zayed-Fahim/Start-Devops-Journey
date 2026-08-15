const { milliseconds } = require('date-fns');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('./env');

const ACCESS_ISSUER = 'start-devops-journey';
const ACCESS_AUDIENCE = 'start-devops-journey-web';

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, status: user.status }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: ACCESS_ISSUER,
    audience: ACCESS_AUDIENCE,
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: ACCESS_ISSUER,
    audience: ACCESS_AUDIENCE,
  });

const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const hashRefreshToken = (token) =>
  crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');

const refreshExpiryDate = () =>
  new Date(Date.now() + milliseconds({ days: env.REFRESH_TOKEN_TTL_DAYS }));

const createCsrfToken = () => crypto.randomBytes(32).toString('base64url');

const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
  createCsrfToken,
  timingSafeEqual,
};
