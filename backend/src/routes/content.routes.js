const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/content.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { requirePermission } = require('../middleware/requirePermission');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission());

router.get('/documents/:kind', asyncHandler(controller.getDocument));
router.put('/documents/:kind', verifyCsrf, asyncHandler(controller.updateDocument));

router.get('/support/requests', asyncHandler(controller.listRequests));
router.post('/support/requests', verifyCsrf, asyncHandler(controller.createRequest));
router.patch(
  '/support/requests/:id',
  verifyCsrf,
  requirePermission('support.manage'),
  asyncHandler(controller.updateRequest),
);

module.exports = router;
