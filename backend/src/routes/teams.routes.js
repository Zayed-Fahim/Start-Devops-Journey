const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/teams.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { requirePermission } = require('../middleware/requirePermission');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get('/', requirePermission('teams.read'), asyncHandler(controller.listTeams));
router.get('/:id', requirePermission('teams.read'), asyncHandler(controller.getTeam));
router.get(
  '/:id/members',
  requirePermission('teams.read', 'users.read'),
  asyncHandler(controller.listMembers),
);

router.post(
  '/',
  verifyCsrf,
  requirePermission('teams.manage'),
  asyncHandler(controller.createTeam),
);
router.patch(
  '/:id',
  verifyCsrf,
  requirePermission('teams.manage'),
  asyncHandler(controller.updateTeam),
);
router.delete(
  '/:id',
  verifyCsrf,
  requirePermission('teams.manage'),
  asyncHandler(controller.deleteTeam),
);

router.post(
  '/:id/members',
  verifyCsrf,
  requirePermission('teams.manage', 'users.read'),
  asyncHandler(controller.addMember),
);
router.delete(
  '/:id/members/:userId',
  verifyCsrf,
  requirePermission('teams.manage'),
  asyncHandler(controller.removeMember),
);

router.patch(
  '/:id/lead',
  verifyCsrf,
  requirePermission('teams.manage'),
  asyncHandler(controller.setLead),
);

module.exports = router;
