const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const controller = require('../controllers/users.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const { verifyCsrf } = require('../middleware/csrf');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', asyncHandler(controller.getStats));
router.get('/', asyncHandler(controller.listUsers));
router.get('/:id', asyncHandler(controller.getUser));

router.post('/', verifyCsrf, requireRole('ADMIN'), asyncHandler(controller.createUser));
router.patch('/:id', verifyCsrf, requireRole('ADMIN'), asyncHandler(controller.updateUser));
router.delete('/:id', verifyCsrf, requireRole('ADMIN'), asyncHandler(controller.deleteUser));

module.exports = router;
