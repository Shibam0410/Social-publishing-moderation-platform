// server.js
// ─────────────────────────────────────────────────────────────
// Main entry point for the Social Publishing & Moderation API.
//
// Start the server:
//   npm start         → production
//   npm run dev       → development (auto-restarts on file changes)
//
// The server listens on PORT defined in .env (default: 3000).
// ─────────────────────────────────────────────────────────────

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// Initialise the database (creates tables if they don't exist)
// This MUST be imported before the routes so the DB is ready.
require('./database/db');

// Start the background cron jobs (Trending, SLA Monitors, Analytics)
require('./services/scheduler').startScheduler();

// ── Create the Express app ────────────────────────────────────
const app = express();

// ── Global Middleware ─────────────────────────────────────────
// Parse incoming JSON request bodies
app.use(express.json());

// Enable Cross-Origin Resource Sharing (so a frontend on a
// different origin can talk to this API)
app.use(cors());

// ── Import Route Modules ──────────────────────────────────────
const authRoutes          = require('./routes/auth');
const postsRoutes         = require('./routes/posts');
const communitiesRoutes   = require('./routes/communities');
const moderationRoutes    = require('./routes/moderation');
const adminRoutes         = require('./routes/admin');
const analyticsRoutes     = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');
const complianceRoutes    = require('./routes/compliance');
const usersRoutes         = require('./routes/users');

// ── Mount Routes ──────────────────────────────────────────────
// All API routes are prefixed with /api
app.use('/api/auth',          authRoutes);
app.use('/api/posts',         postsRoutes);
app.use('/api/communities',   communitiesRoutes);
app.use('/api/moderation',    moderationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/compliance',    complianceRoutes);
app.use('/api/users',         usersRoutes);

// ── Health Check ──────────────────────────────────────────────
// A simple endpoint to verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Handler ───────────────────────────────────────────────
// Catches any request that didn't match a route above
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global Error Handler ──────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// ── Start the Server ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📋 API base URL: http://localhost:${PORT}/api`);
});
