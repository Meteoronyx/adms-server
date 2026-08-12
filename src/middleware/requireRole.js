'use strict';

/**
 * Middleware for Permission-Based Access Control (PBAC / Dynamic RBAC).
 * Checks if the logged-in user has the required permission(s).
 *
 * @param {string|Array<string>} requiredPermissions - Permission code or array of permission codes
 * @param {Object} options - Options ({ requireAll: false })
 */
function requirePermission(requiredPermissions = [], options = { requireAll: false }) {
  const permissionsNeeded = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak terautentikasi'
      });
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

    // System Admin or wildcard '*' permission has access to all routes
    if (req.user.role === 'admin' || userPermissions.includes('*')) {
      return next();
    }

    const hasPermission = options.requireAll
      ? permissionsNeeded.every(p => userPermissions.includes(p))
      : permissionsNeeded.some(p => userPermissions.includes(p));

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki hak akses (permission) untuk tindakan ini'
    });
  };
}

/**
 * Middleware for Role-Based Access Control (RBAC).
 * Checks if the logged-in user has one of the allowed roles.
 *
 * @param {Array<string>} allowedRoles - List of allowed roles (e.g. ['admin'], ['admin', 'operator'])
 */
function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak terautentikasi'
      });
    }

    // Admin has access to all routes by default
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini'
    });
  };
}

module.exports = requireRole;
module.exports.requireRole = requireRole;
module.exports.requirePermission = requirePermission;
