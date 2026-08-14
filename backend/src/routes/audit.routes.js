const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/audit.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

router.use(requireAuth, requirePermission('audit.read'));

router.get('/stats', asyncHandler(controller.getAuditStats));
router.get('/', asyncHandler(controller.listAuditLogs));

module.exports = router;
