const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(controller.listNotifications));
router.get('/unread-count', asyncHandler(controller.unreadCount));
router.post('/read-all', verifyCsrf, asyncHandler(controller.markAllRead));
router.patch('/:id/read', verifyCsrf, asyncHandler(controller.markRead));

module.exports = router;
