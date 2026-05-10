'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');

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
  res.json({ success: true, token });
});

router.post('/admin/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
