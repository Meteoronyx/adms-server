'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_SECRET = config.JWT_SECRET;

const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!JWT_SECRET) {
    res.status(500).json({
      success: false,
      message: 'Server configuration error: JWT_SECRET (ADMIN_API_KEY) is not configured'
    });
    return;
  }

  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: config.RESPONSE.ADMIN.UNAUTHORIZED
    });
    return;
  }

  // 1. Try verify as JWT (issued by /admin/login)
  try {
    jwt.verify(apiKey, JWT_SECRET);
    return next();
  } catch {
    // not a valid JWT, continue to fallback
  }

  // 2. Fallback: compare as plain API key (for curl/Postman compatibility)
  if (apiKey === JWT_SECRET) {
    return next();
  }

  res.status(401).json({
    success: false,
    message: config.RESPONSE.ADMIN.UNAUTHORIZED
  });
};

module.exports = apiKeyAuth;
