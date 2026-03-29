// routes/auth.js
const express = require('express');
const router  = express.Router();

const { register, login, getProfile, updateProfile, oauthLogin, setupMFA, verifyMFA, mfaLogin } = require('../controllers/authController');
const { acceptInvite, forgotPassword, resetPassword, validateInviteToken } = require('../controllers/inviteController');
const authMiddleware = require('../middleware/authMiddleware');

// ── Public routes ─────────────────────────────────────────────
router.post('/register',            register);
router.post('/login',               login);
router.post('/oauth',               oauthLogin);
router.post('/mfa-login',           mfaLogin);

// ── Invite & Password Reset (public — token-gated) ────────────
router.get('/validate-invite',      validateInviteToken);
router.post('/accept-invite',       acceptInvite);
router.post('/forgot-password',     forgotPassword);
router.post('/reset-password',      resetPassword);

// ── Protected routes ──────────────────────────────────────────
router.get('/profile',       authMiddleware, getProfile);
router.put('/profile',       authMiddleware, updateProfile);
router.post('/mfa/setup',    authMiddleware, setupMFA);
router.post('/mfa/verify',   authMiddleware, verifyMFA);

module.exports = router;
