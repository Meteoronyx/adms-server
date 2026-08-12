'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

const JWT_SECRET = config.JWT_SECRET;
const IS_COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_COOKIE_SECURE,
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000 // 8 hours
};

function clearAuthCookie(res) {
  res.clearCookie('token', { httpOnly: true, secure: IS_COOKIE_SECURE, sameSite: 'lax' });
}

const apiKeyAuth = async (req, res, next) => {
  if (!JWT_SECRET) {
    res.status(500).json({
      success: false,
      message: 'Server configuration error: JWT_SECRET (ADMIN_API_KEY) is not configured'
    });
    return;
  }

  // Look for token in cookie, Authorization Bearer header, or x-api-key header
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.headers['x-api-key'];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: config.RESPONSE.ADMIN.UNAUTHORIZED
    });
  }

  // Fallback check for raw static API Key (e.g. system scripts/integrations)
  if (token === JWT_SECRET) {
    req.user = {
      id: 'system',
      username: 'admin',
      name: 'System API Key',
      role: 'admin',
      role_name: 'Administrator',
      permissions: ['*']
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user in PostgreSQL to ensure account is still active and valid
    const userQuery = `
      SELECT 
        u.id, 
        u.username, 
        u.name, 
        u.is_active, 
        u.role_id,
        COALESCE(r.slug, u.role) AS role_slug,
        COALESCE(r.name, u.role) AS role_name,
        COALESCE(ARRAY_REMOVE(ARRAY_AGG(p.code), NULL), '{}') AS permissions
      FROM users u
      LEFT JOIN roles r ON (u.role_id IS NOT NULL AND u.role_id = r.id) OR (u.role_id IS NULL AND LOWER(u.role) = r.slug)
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE ${decoded.id ? 'u.id = $1' : 'u.username = $1'}
      GROUP BY u.id, u.username, u.name, u.is_active, u.role_id, r.slug, r.name;
    `;
    const dbRes = await query(userQuery, [decoded.id || decoded.username]);
    const dbUser = dbRes.rows[0];

    if (!dbUser || !dbUser.is_active) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Akun telah dinonaktifkan atau tidak ditemukan'
      });
    }

    const isSystemAdmin = dbUser.role_slug === 'admin';
    const permissionsList = Array.isArray(dbUser.permissions) ? dbUser.permissions : [];

    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
      role: dbUser.role_slug,
      role_name: dbUser.role_name,
      role_id: dbUser.role_id,
      permissions: isSystemAdmin ? ['*', ...permissionsList] : permissionsList
    };

    return next();
  } catch (err) {
    clearAuthCookie(res);
    return res.status(401).json({
      success: false,
      message: config.RESPONSE.ADMIN.UNAUTHORIZED
    });
  }
};

module.exports = apiKeyAuth;
module.exports.COOKIE_OPTIONS = COOKIE_OPTIONS;
module.exports.clearAuthCookie = clearAuthCookie;
