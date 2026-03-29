// middleware/authMiddleware.js
// ─────────────────────────────────────────────────────────────
// This middleware checks that the incoming request has a valid
// JSON Web Token (JWT).  Any route that needs a logged-in user
// should use this middleware.
//
// How it works:
//   1. Look for the "Authorization" header with format:
//        Authorization: Bearer <token>
//   2. Verify the token using the secret key.
//   3. If valid, attach the decoded user info to `req.user`
//      and call `next()` to continue to the route handler.
//   4. If invalid or missing, respond with 401 Unauthorized.
// ─────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const db = require('../database/db');

// The secret key used to sign & verify JWTs.
// In production this should be a long random string stored in .env
const JWT_SECRET = process.env.JWT_SECRET || 'changeme_super_secret';

function authMiddleware(req, res, next) {
  // Get the Authorization header value
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  // The header looks like "Bearer eyJhbG..."
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Malformed token. Format: Bearer <token>' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fresh DB lookup to ensure we catch bans/suspensions instantly
    const dbUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(decoded.id);
    if (!dbUser) return res.status(401).json({ error: 'User no longer exists.' });

    if (dbUser.status === 'banned' || dbUser.status === 'PERMANENTLY_BANNED') {
      return res.status(403).json({ error: 'Account has been permanently banned.' });
    }

    // Suspension means read-only. Block anything that modifies state (POST, PUT, DELETE)
    // Exception: Allow them to request account deletion if they want
    if (dbUser.status === 'suspended' && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      if (!req.originalUrl.includes('/compliance/deletion')) {
        return res.status(403).json({ error: 'Account is temporarily suspended (read-only mode).' });
      }
    }

    req.user = dbUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = authMiddleware;
