const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/account.controller');
const contentController = require('../controllers/content.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  },
});

router.use(requireAuth);

router.get('/sessions', asyncHandler(controller.listSessions));
router.delete('/sessions/:id', verifyCsrf, asyncHandler(controller.revokeSession));
router.post('/sessions/revoke-others', verifyCsrf, asyncHandler(controller.revokeOtherSessions));
router.post(
  '/password',
  passwordChangeLimiter,
  verifyCsrf,
  asyncHandler(controller.changePassword),
);

router.patch('/preferences', verifyCsrf, asyncHandler(contentController.updatePreferences));

module.exports = router;
