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

/**
 * Mengembalikan seluruh UUID OPD yang berada dalam cakupan akses sebuah OPD:
 * - OPD itu sendiri
 * - Seluruh Sub-OPD yang memiliki parent_id = opdId
 * - Fallback otomatis berdasarkan 4 digit prefix kdunker apabila opdId adalah OPD Induk (XXXX00000000000)
 */
async function getAccessibleOpdIds(opdId, kdunker = null) {
  if (!opdId) return [];
  let resolvedKdunker = kdunker;
  if (!resolvedKdunker) {
    try {
      const kRes = await query('SELECT kdunker FROM opds WHERE id = $1 AND deleted_at IS NULL', [opdId]);
      resolvedKdunker = kRes.rows[0]?.kdunker || null;
    } catch (_) {
      resolvedKdunker = null;
    }
  }

  const isIndukPattern = resolvedKdunker && resolvedKdunker.length === 15 && resolvedKdunker.endsWith('00000000000');
  const prefix = isIndukPattern ? `${resolvedKdunker.substring(0, 4)}%` : null;

  try {
    const res = await query(
      `SELECT id FROM opds
       WHERE deleted_at IS NULL
         AND (
           id = $1
           OR parent_id = $1
           OR ($2::text IS NOT NULL AND kdunker LIKE $2)
         )`,
      [opdId, prefix]
    );
    return res.rows.length > 0 ? res.rows.map(r => r.id) : [opdId];
  } catch (_) {
    if (prefix) {
      const fallbackRes = await query(
        `SELECT id FROM opds WHERE deleted_at IS NULL AND (id = $1 OR kdunker LIKE $2)`,
        [opdId, prefix]
      );
      return fallbackRes.rows.length > 0 ? fallbackRes.rows.map(r => r.id) : [opdId];
    }
    return [opdId];
  }
}

/**
 * Memeriksa apakah user memiliki akses ke targetOpdId (baik milik sendiri maupun Sub-OPD di bawah naungannya)
 */
function canAccessOpd(user, targetOpdId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!targetOpdId) return false;
  if (Array.isArray(user.accessible_opd_ids) && user.accessible_opd_ids.length > 0) {
    return user.accessible_opd_ids.includes(targetOpdId);
  }
  return Boolean(user.opd_id && user.opd_id === targetOpdId);
}

/**
 * Menghasilkan daftar UUID OPD untuk query filtering:
 * - null: Superadmin tanpa filter spesifik (lihat semua)
 * - string[]: Daftar UUID yang diizinkan (bisa kosong [] jika tidak punya akses)
 */
async function resolveScopedOpdIds(user, requestedOpdId = null) {
  if (!user) return [];
  const cleanRequested = requestedOpdId ? String(requestedOpdId).trim() : null;

  if (user.role === 'admin') {
    if (!cleanRequested) return null;
    return getAccessibleOpdIds(cleanRequested);
  }

  const allowedIds = Array.isArray(user.accessible_opd_ids) && user.accessible_opd_ids.length > 0
    ? user.accessible_opd_ids
    : (user.opd_id ? [user.opd_id] : []);

  if (allowedIds.length === 0) return [];

  if (cleanRequested) {
    return allowedIds.includes(cleanRequested) ? [cleanRequested] : [];
  }

  return allowedIds;
}

async function getUserProfile(identifier) {
  if (!identifier) return null;
  const isObject = typeof identifier === 'object' && identifier !== null;
  const id = isObject ? identifier.id : (typeof identifier === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier) ? identifier : null);
  const username = isObject ? identifier.username : (!id ? identifier : null);

  const whereClause = id ? 'u.id = $1' : 'u.username = $1';
  const param = id || username;
  if (!param) return null;

  const userQuery = `
    SELECT 
      u.id, 
      u.username, 
      u.name, 
      u.is_active, 
      u.role_id,
      u.opd_id,
      o.nama_opd,
      o.kdunker,
      COALESCE(r.slug, u.role) AS role_slug,
      COALESCE(r.name, u.role) AS role_name,
      COALESCE(ARRAY_REMOVE(ARRAY_AGG(p.code), NULL), '{}') AS permissions
    FROM users u
    LEFT JOIN roles r ON (u.role_id IS NOT NULL AND u.role_id = r.id) OR (u.role_id IS NULL AND LOWER(u.role) = r.slug)
    LEFT JOIN opds o ON u.opd_id = o.id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE ${whereClause}
    GROUP BY u.id, u.username, u.name, u.is_active, u.role_id, u.opd_id, o.nama_opd, o.kdunker, r.slug, r.name;
  `;
  const dbRes = await query(userQuery, [param]);
  const dbUser = dbRes.rows[0];

  if (!dbUser || !dbUser.is_active) {
    return null;
  }

  const isSystemAdmin = dbUser.role_slug === 'admin';
  const permissionsList = Array.isArray(dbUser.permissions) ? dbUser.permissions : [];
  const accessibleOpdIds = !isSystemAdmin && dbUser.opd_id
    ? await getAccessibleOpdIds(dbUser.opd_id, dbUser.kdunker)
    : [];

  return {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role_slug,
    role_name: dbUser.role_name,
    role_id: dbUser.role_id,
    opd_id: dbUser.opd_id,
    nama_opd: dbUser.nama_opd,
    kdunker: dbUser.kdunker,
    is_parent_opd: accessibleOpdIds.length > 1,
    accessible_opd_ids: accessibleOpdIds,
    permissions: isSystemAdmin ? ['*', ...permissionsList] : permissionsList
  };
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
    const userProfile = await getUserProfile({ id: decoded.id, username: decoded.username });

    if (!userProfile) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Akun telah dinonaktifkan atau tidak ditemukan'
      });
    }

    req.user = userProfile;
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
module.exports.getUserProfile = getUserProfile;
module.exports.getAccessibleOpdIds = getAccessibleOpdIds;
module.exports.canAccessOpd = canAccessOpd;
module.exports.resolveScopedOpdIds = resolveScopedOpdIds;
