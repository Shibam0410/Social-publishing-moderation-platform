// routes/communities.js
const express = require('express');
const router  = express.Router();

const {
  listCommunities,
  createCommunity,
  editCommunity,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunityPosts,
  setPolicy,
  removeMember,
  removeCommunityPost,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getCommunityMembers
} = require('../controllers/communitiesController');

const authMiddleware = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// Intercept optional auth for list
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
      req.user = decoded;
    } catch (e) {
      // ignore invalid token, proceed as anonymous
    }
  }
  next();
};

router.get('/',                            optionalAuth, listCommunities);
router.post('/',           authMiddleware, createCommunity);
router.put('/:id',         authMiddleware, editCommunity);
router.get('/:id',                         getCommunity);
router.post('/:id/join',   authMiddleware, joinCommunity);
router.post('/:id/leave',  authMiddleware, leaveCommunity);
router.get('/:id/posts',                   optionalAuth, getCommunityPosts);
router.get('/:id/members',                 optionalAuth, getCommunityMembers);

router.patch('/:id/policy',          authMiddleware, setPolicy);
router.delete('/:id/members/:userId',authMiddleware, removeMember);
router.delete('/:id/posts/:postId',  authMiddleware, removeCommunityPost);

// Requests endpoints
router.get('/:id/requests',                         authMiddleware, getJoinRequests);
router.post('/:id/requests/:userId/approve',        authMiddleware, approveJoinRequest);
router.post('/:id/requests/:userId/reject',         authMiddleware, rejectJoinRequest);

module.exports = router;
