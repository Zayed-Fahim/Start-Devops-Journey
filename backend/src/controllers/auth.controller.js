const authService = require('../services/auth.service');
const { parseOrThrow } = require('../validation/users.validation');
const { registerSchema, loginSchema } = require('../validation/auth.validation');
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } = require('../lib/cookies');
const { HttpError } = require('../lib/httpError');
const { loadUserPermissions } = require('../middleware/requirePermission');

const requestContext = (req) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ip: req.ip ?? undefined,
});

const register = async (req, res) => {
  const data = parseOrThrow(registerSchema, req.body, 'Invalid request body');
  const { user, tokens } = await authService.register(data, requestContext(req));
  setAuthCookies(res, tokens);
  res.status(201).json({ user, csrfToken: tokens.csrfToken });
};

const login = async (req, res) => {
  const data = parseOrThrow(loginSchema, req.body, 'Invalid request body');
  const { user, tokens } = await authService.login(data, requestContext(req));
  setAuthCookies(res, tokens);
  res.status(200).json({ user, csrfToken: tokens.csrfToken });
};

const refresh = async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE];
  try {
    const { user, tokens } = await authService.rotateRefreshToken(presented, requestContext(req));
    setAuthCookies(res, tokens);
    res.status(200).json({ user, csrfToken: tokens.csrfToken });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
};

const logout = async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE], requestContext(req));
  clearAuthCookies(res);
  res.status(204).end();
};

const me = async (req, res) => {
  const user = await authService.getSessionUser(req.user.id);
  if (!user) throw new HttpError(401, 'NOT_AUTHENTICATED', 'Authentication required');
  const permissions = await loadUserPermissions(req.user.id);
  res.status(200).json({ ...user, permissions });
};

module.exports = { register, login, refresh, logout, me };
