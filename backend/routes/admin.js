// routes/admin.js
const express = require('express');
const router  = express.Router();

const {
  getUsers,
  changeRole,
  adminUpdateUser,
  warnUser,
  suspendUser,
  banUser,
  restoreUser
} = require('../controllers/adminController');

const { inviteUser } = require('../controllers/inviteController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/roleMiddleware');

const adminGuard = [authMiddleware, requireRole('admin')];

router.post('/invite',             ...adminGuard, inviteUser);        // send invite email
router.get('/users',               ...adminGuard, getUsers);
router.patch('/users/:id',         ...adminGuard, adminUpdateUser);  // update email + role
router.patch('/users/:id/role',    ...adminGuard, changeRole);

router.post('/users/:id/warn',     ...adminGuard, warnUser);
router.post('/users/:id/suspend',  ...adminGuard, suspendUser);
router.post('/users/:id/ban',      ...adminGuard, banUser);
router.post('/users/:id/restore',  ...adminGuard, restoreUser);

module.exports = router;
