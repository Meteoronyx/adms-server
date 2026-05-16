'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_SECRET = config.JWT_SECRET;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000 // 8 hours
};

function clearAuthCookie(res) {
  res.clearCookie('token', { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'strict' });
}

const apiKeyAuth = (req, res, next) => {
  if (!JWT_SECRET) {
    res.status(500).json({
      success: false,
      message: 'Server configuration error: JWT_SECRET (ADMIN_API_KEY) is not configured'
    });
    return;
  }

  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      clearAuthCookie(res);
      res.status(401).json({
        success: false,
        message: config.RESPONSE.ADMIN.UNAUTHORIZED
      });
      return;
    }
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: config.RESPONSE.ADMIN.UNAUTHORIZED
    });
    return;
  }

  try {
    const decoded = jwt.verify(apiKey, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    // not a valid JWT, continue to fallback
  }
  if (apiKey === JWT_SECRET) {
    req.user = { username: 'admin' };
    return next();
  }

  res.status(401).json({
    success: false,
    message: config.RESPONSE.ADMIN.UNAUTHORIZED
  });
};

module.exports = apiKeyAuth;
module.exports.COOKIE_OPTIONS = COOKIE_OPTIONS;
module.exports.clearAuthCookie = clearAuthCookie;
