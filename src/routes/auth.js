'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { query } = require('../db/connection');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const requireRole = require('../middleware/requireRole');
const asyncHandler = require('../middleware/asyncHandler');
const userController = require('../controllers/userController');
const logger = require('../utils/logger');
const { COOKIE_OPTIONS, clearAuthCookie } = apiKeyAuth;

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

const JWT_SECRET = config.JWT_SECRET;

// POST /admin/login — Database-backed authentication
router.post('/admin/login', loginLimiter, asyncHandler(async (req, res) => {
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

  // Sign JWT with user info
  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  // Set HTTP-only cookie
  res.cookie('token', token, COOKIE_OPTIONS);

  logger.info(`Pengguna '${user.username}' (${user.role}) berhasil login`);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
}));

// POST /admin/logout
router.post('/admin/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// GET /admin/me — Current user profile
router.get('/admin/me', apiKeyAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// =========================================================
// USER MANAGEMENT ROUTES (/admin/users)
// =========================================================
router.get('/admin/users', apiKeyAuth, requireRole(['admin']), asyncHandler(userController.listUsers));
router.post('/admin/users', apiKeyAuth, requireRole(['admin']), asyncHandler(userController.createUser));
router.put('/admin/users/:id', apiKeyAuth, requireRole(['admin']), asyncHandler(userController.updateUser));
router.put('/admin/users/:id/password', apiKeyAuth, asyncHandler(userController.changePassword));
router.delete('/admin/users/:id', apiKeyAuth, requireRole(['admin']), asyncHandler(userController.deleteUser));

module.exports = router;
