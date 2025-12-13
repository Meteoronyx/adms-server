'use strict';

const config = require('../config');

const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!validApiKey) {
    res.status(500).json({
      success: false,
      message: 'Server configuration error: ADMIN_API_KEY not set'
    });
    return;
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      success: false,
      message: config.RESPONSE.ADMIN.UNAUTHORIZED
    });
    return;
  }

  next();
};

module.exports = apiKeyAuth;
