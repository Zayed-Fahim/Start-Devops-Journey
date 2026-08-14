const accountService = require('../services/account.service');
const { parseOrThrow } = require('../validation/users.validation');
const { changePasswordSchema, sessionIdParamSchema } = require('../validation/account.validation');
const { REFRESH_COOKIE } = require('../lib/cookies');

const requestContext = (req) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ip: req.ip ?? undefined,
});

const listSessions = async (req, res) => {
  const sessions = await accountService.listSessions(req.user.id, req.cookies?.[REFRESH_COOKIE]);
  res.status(200).json({ data: sessions });
};

const revokeSession = async (req, res) => {
  const { id } = parseOrThrow(sessionIdParamSchema, req.params, 'Invalid session id');
  const result = await accountService.revokeSession(
    req.user.id,
    id,
    req.cookies?.[REFRESH_COOKIE],
    requestContext(req),
  );
  res.status(200).json(result);
};

const revokeOtherSessions = async (req, res) => {
  const result = await accountService.revokeOtherSessions(
    req.user.id,
    req.cookies?.[REFRESH_COOKIE],
    requestContext(req),
  );
  res.status(200).json(result);
};

const changePassword = async (req, res) => {
  const data = parseOrThrow(changePasswordSchema, req.body, 'Invalid request body');
  const result = await accountService.changePassword(
    req.user.id,
    data,
    req.cookies?.[REFRESH_COOKIE],
    requestContext(req),
  );
  res.status(200).json(result);
};

module.exports = { listSessions, revokeSession, revokeOtherSessions, changePassword };
