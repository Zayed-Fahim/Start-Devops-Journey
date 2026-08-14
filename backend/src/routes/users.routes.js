const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { requirePermission } = require('../middleware/requirePermission');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', requirePermission('users.read'), asyncHandler(controller.getStats));
router.get('/', requirePermission('users.read'), asyncHandler(controller.listUsers));
router.get('/:id', requirePermission('users.read'), asyncHandler(controller.getUser));

router.post(
  '/',
  verifyCsrf,
  requirePermission('users.create'),
  asyncHandler(controller.createUser),
);
router.patch(
  '/:id',
  verifyCsrf,
  requirePermission('users.update'),
  asyncHandler(controller.updateUser),
);
router.delete(
  '/:id',
  verifyCsrf,
  requirePermission('users.delete'),
  asyncHandler(controller.deleteUser),
);

module.exports = router;
