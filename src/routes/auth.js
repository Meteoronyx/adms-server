'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { query } = require('../db/connection');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { requireRole, requirePermission } = require('../middleware/requireRole');
const asyncHandler = require('../middleware/asyncHandler');
const userController = require('../controllers/userController');
const logger = require('../utils/logger');
const { COOKIE_OPTIONS, clearAuthCookie, getUserProfile } = apiKeyAuth;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: (req, res) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.warn(`Percobaan login dibatasi untuk IP: ${clientIp}`, { ip: clientIp });

    res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: (req, res) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.warn(`Percobaan ganti password dibatasi untuk IP: ${clientIp}`, { ip: clientIp });

    res.status(429).json({
      success: false,
      message: 'Terlalu banyak percobaan ganti password, silakan coba lagi setelah 15 menit.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const JWT_SECRET = config.JWT_SECRET;

// Login handler
const handleLogin = asyncHandler(async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: JWT_SECRET (ADMIN_API_KEY) is not configured'
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi'
    });
  }

  const cleanUsername = username.trim().toLowerCase();

  // Find user in PostgreSQL
  const userRes = await query(
    'SELECT id, username, password_hash, name, role, is_active FROM users WHERE username = $1',
    [cleanUsername]
  );

  const user = userRes.rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json({
      success: false,
      message: 'Username atau password yang Anda masukkan salah'
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Username atau password yang Anda masukkan salah'
    });
  }

  // Update last_login_at timestamp
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  // Fetch full user profile with permissions & OPD scoping
  const userProfile = await getUserProfile(user.id);

  // Sign JWT with user info
  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: userProfile?.role || user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  // Set HTTP-only cookie
  res.cookie('token', token, COOKIE_OPTIONS);

  logger.info(`Pengguna '${user.username}' (${userProfile?.role || user.role}) berhasil login`);

  res.json({
    success: true,
    token,
    user: userProfile || {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: []
    }
  });
});

// Logout handler
const handleLogout = (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
};

// Me handler
const handleMe = (req, res) => {
  res.json({ success: true, user: req.user });
};

// Authentication routes (/auth/* and /admin/* aliases)
router.post('/auth/login', loginLimiter, handleLogin);
router.post('/admin/login', loginLimiter, handleLogin);

router.post('/auth/logout', handleLogout);
router.post('/admin/logout', handleLogout);

router.get('/auth/me', apiKeyAuth, handleMe);
router.get('/admin/me', apiKeyAuth, handleMe);

// Self-service password change
router.put('/auth/change-password', apiKeyAuth, changePasswordLimiter, asyncHandler(userController.changeOwnPassword));
router.put('/admin/change-password', apiKeyAuth, changePasswordLimiter, asyncHandler(userController.changeOwnPassword));

// =========================================================
// USER MANAGEMENT ROUTES (/admin/users)
// =========================================================
router.get('/admin/users', apiKeyAuth, requirePermission('users:read'), asyncHandler(userController.listUsers));
router.post('/admin/users', apiKeyAuth, requirePermission('users:write'), asyncHandler(userController.createUser));
router.put('/admin/users/:id', apiKeyAuth, requirePermission('users:write'), asyncHandler(userController.updateUser));
router.put('/admin/users/:id/password', apiKeyAuth, requirePermission('users:write'), asyncHandler(userController.changePassword));
router.delete('/admin/users/:id', apiKeyAuth, requirePermission('users:delete'), asyncHandler(userController.deleteUser));

module.exports = router;
