const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/roles.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { requirePermission } = require('../middleware/requirePermission');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/permissions',
  requirePermission('roles.read'),
  asyncHandler(controller.listPermissions),
);
router.get('/', requirePermission('roles.read'), asyncHandler(controller.listRoles));
router.get('/:id', requirePermission('roles.read'), asyncHandler(controller.getRole));

router.post(
  '/',
  verifyCsrf,
  requirePermission('roles.manage'),
  asyncHandler(controller.createRole),
);
router.patch(
  '/:id',
  verifyCsrf,
  requirePermission('roles.manage'),
  asyncHandler(controller.updateRole),
);
router.delete(
  '/:id',
  verifyCsrf,
  requirePermission('roles.manage'),
  asyncHandler(controller.deleteRole),
);

module.exports = router;
