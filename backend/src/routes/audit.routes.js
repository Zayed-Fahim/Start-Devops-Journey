const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/audit.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/stats', asyncHandler(controller.getAuditStats));
router.get('/', asyncHandler(controller.listAuditLogs));

module.exports = router;
