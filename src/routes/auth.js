'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const { COOKIE_OPTIONS, clearAuthCookie } = require('../middleware/apiKeyAuth');

const JWT_SECRET = config.JWT_SECRET;
const ADMIN_USERNAME = config.ADMIN_USERNAME;
const ADMIN_PASSWORD = config.ADMIN_PASSWORD;

// POST /admin/login
router.post('/admin/login', (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Server configuration error: JWT_SECRET (ADMIN_API_KEY) is not configured' });
  }

  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Username atau password yang anda masukkan salah' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });

  // Set HTTP-only cookie
  res.cookie('token', token, COOKIE_OPTIONS);

  // Keep backward-compat header for non-browser clients
  res.json({ success: true, token });
});

router.post('/admin/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// GET /admin/me — lightweight auth check endpoint
router.get('/admin/me', (req, res) => {
  const cookieToken = req.cookies?.token;
  if (!cookieToken || !JWT_SECRET) {
    return res.status(401).json({ success: false, message: config.RESPONSE.ADMIN.UNAUTHORIZED });
  }
  try {
    const decoded = jwt.verify(cookieToken, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch {
    res.status(401).json({ success: false, message: config.RESPONSE.ADMIN.UNAUTHORIZED });
  }
});

module.exports = router;
