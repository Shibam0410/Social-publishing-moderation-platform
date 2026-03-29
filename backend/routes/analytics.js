// routes/analytics.js
const express = require('express');
const router  = express.Router();

const { getPlatformSummary, getCreatorAnalytics } = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/roleMiddleware');

// Platform summary — admins & analysts only
router.get('/summary', authMiddleware, requireRole('admin', 'analyst'), getPlatformSummary);

// Per-post analytics — creator, admin, or analyst
router.get('/posts/:id', authMiddleware, requireRole('creator', 'admin', 'analyst'), getCreatorAnalytics);

module.exports = router;
