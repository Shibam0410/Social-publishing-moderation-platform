const express = require('express');
const router  = express.Router();
const { getUserProfile, followUser, unfollowUser, getFollowers, getFollowing, getSuggestedUsers, searchUsers } = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

const jwt = require('jsonwebtoken');

// Intercept optional auth to see if the viewing user is logged in
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
      req.user = decoded;
    } catch (e) {}
  }
  next();
};

router.get('/search', optionalAuth, searchUsers);
router.get('/:username', optionalAuth, getUserProfile);
router.post('/:id/follow', authMiddleware, followUser);
router.post('/:id/unfollow', authMiddleware, unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

module.exports = router;
