'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const publicController = require('../controllers/publicController');
const logger = require('../utils/logger');

// Rate limiting: Maksimal 60 request per menit per IP untuk endpoint publik
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded on public device-status', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.',
    });
  },
});

// Endpoint data API publik
router.get('/api/public/device-status', publicLimiter, publicController.getPublicDeviceStatus);

// Alias jika client me-request JSON langsung ke /public/device-status tanpa /api
router.get('/public/device-status', (req, res, next) => {
  if (!req.accepts('html') || req.headers.accept?.includes('application/json')) {
    return publicLimiter(req, res, () => publicController.getPublicDeviceStatus(req, res));
  }
  next();
});

module.exports = router;
