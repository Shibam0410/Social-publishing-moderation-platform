// middleware/roleMiddleware.js
// ─────────────────────────────────────────────────────────────
// Role-Based Access Control (RBAC) middleware.
//
// Usage example (in a route file):
//   const requireRole = require('../middleware/roleMiddleware');
//
//   // Only admins can access this route
//   router.delete('/users/:id', auth, requireRole('admin'), handler);
//
//   // Both moderators AND admins can access this
//   router.get('/reports', auth, requireRole('moderator', 'admin'), handler);
//
// This middleware must be used AFTER authMiddleware so that
// req.user is already populated.
// ─────────────────────────────────────────────────────────────

/**
 * Returns a middleware function that only allows users
 * whose role is included in the `allowedRoles` list.
 *
 * @param  {...string} allowedRoles - One or more role strings
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // req.user is set by authMiddleware
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}`
      });
    }

    // User has a permitted role — pass control to the next handler
    next();
  };
}

module.exports = requireRole;
