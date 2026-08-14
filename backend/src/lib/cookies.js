const env = require('./env');

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const CSRF_COOKIE = 'csrf_token';

const accessMaxAge = 15 * 60 * 1000;
const refreshMaxAge = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const setAuthCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: accessMaxAge,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshMaxAge,
  });

  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshMaxAge,
  });
};

const clearAuthCookies = (res) => {
  const base = { httpOnly: true, secure: env.isProduction, sameSite: 'lax', path: '/' };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
};

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  setAuthCookies,
  clearAuthCookies,
};
