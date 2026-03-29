const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_super_secret';

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(decoded.id);
    
    // Only attach user if active (just like regular authMiddleware)
    if (dbUser && dbUser.status !== 'banned' && dbUser.status !== 'PERMANENTLY_BANNED') {
      req.user = dbUser;
    }
  } catch (err) {
    // Silently ignore token errors for optional auth (treat as anonymous)
  }

  next();
}

module.exports = optionalAuthMiddleware;
