'use strict';

const bcrypt = require('bcrypt');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * GET /admin/users
 * List all registered users with role & OPD details
 */
async function listUsers(req, res) {
  const result = await query(
    `SELECT 
       u.id, 
       u.username, 
       u.name, 
       COALESCE(r.slug, u.role) AS role,
       COALESCE(r.name, u.role) AS role_name,
       u.role_id,
       u.opd_id,
       o.kdunker,
       o.nama_opd,
       u.is_active, 
       u.last_login_at, 
       u.created_at, 
       u.updated_at
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id OR LOWER(u.role) = r.slug
     LEFT JOIN opds o ON u.opd_id = o.id
     ORDER BY u.created_at ASC`
  );

  res.json({
    success: true,
    data: result.rows
  });
}

/**
 * POST /admin/users
 * Create a new user with dynamic role & OPD assignment
 */
async function createUser(req, res) {
  const { username, password, name, role, role_id, opd_id } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Username minimal 3 karakter'
    });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({
      success: false,
      message: 'Username hanya boleh berisi huruf, angka, dan underscore (_)'
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password minimal 6 karakter'
    });
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Nama pengguna wajib diisi'
    });
  }

  // Find dynamic role by role_id or slug (fallback to operator)
  let targetRole = null;
  if (role_id) {
    const rRes = await query('SELECT id, name, slug FROM roles WHERE id = $1', [role_id]);
    targetRole = rRes.rows[0];
  } else if (role) {
    const rRes = await query('SELECT id, name, slug FROM roles WHERE slug = $1 OR LOWER(name) = LOWER($2)', [role, role]);
    targetRole = rRes.rows[0];
  }

  if (!targetRole) {
    const defaultRes = await query("SELECT id, name, slug FROM roles WHERE slug = 'operator'");
    targetRole = defaultRes.rows[0] || { id: null, name: 'Operator', slug: 'operator' };
  }

  // Multi-tenant OPD scoping: user non-admin wajib terikat ke unit kerja (OPD)
  if (targetRole.slug !== 'admin') {
    if (!opd_id || typeof opd_id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Pengguna non-admin wajib memilih Induk Unit Kerja (OPD)'
      });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opd_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID OPD tidak valid'
      });
    }
  }

  // Check OPD validity if provided
  let targetOpdId = null;
  let targetOpdName = null;
  let targetKdunker = null;
  if (opd_id) {
    if (typeof opd_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opd_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID OPD tidak valid'
      });
    }
    const opdRes = await query('SELECT id, nama_opd, kdunker FROM opds WHERE id = $1 AND deleted_at IS NULL', [opd_id]);
    if (opdRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit kerja (OPD) tidak ditemukan'
      });
    }
    targetOpdId = opdRes.rows[0].id;
    targetOpdName = opdRes.rows[0].nama_opd;
    targetKdunker = opdRes.rows[0].kdunker;
  }

  // Check username uniqueness
  const existing = await query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
  if (existing.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Username '${cleanUsername}' sudah digunakan`
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const insertRes = await query(
    `INSERT INTO users (username, password_hash, name, role, role_id, opd_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, username, name, role, role_id, opd_id, is_active, created_at`,
    [cleanUsername, passwordHash, name.trim(), targetRole.slug, targetRole.id, targetOpdId]
  );

  logger.info(`Pengguna baru '${cleanUsername}' (${targetRole.name}) berhasil dibuat oleh ${req.user.username}`);

  res.status(201).json({
    success: true,
    message: 'Pengguna berhasil dibuat',
    data: {
      ...insertRes.rows[0],
      role_name: targetRole.name,
      nama_opd: targetOpdName,
      kdunker: targetKdunker
    }
  });
}

/**
 * PUT /admin/users/:id
 * Update user details, dynamic role, & OPD assignment
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, role, role_id, opd_id, is_active } = req.body;

  const userCheck = await query('SELECT id, username, role, role_id, opd_id FROM users WHERE id = $1', [id]);
  if (userCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Pengguna tidak ditemukan'
    });
  }

  const targetUser = userCheck.rows[0];

  // Prevent admin from deactivating themselves
  if (req.user.id === targetUser.id && is_active === false) {
    return res.status(400).json({
      success: false,
      message: 'Anda tidak dapat menonaktifkan akun sendiri'
    });
  }

  let targetRole = null;
  if (role_id) {
    const rRes = await query('SELECT id, name, slug FROM roles WHERE id = $1', [role_id]);
    targetRole = rRes.rows[0];
  } else if (role) {
    const rRes = await query('SELECT id, name, slug FROM roles WHERE slug = $1 OR LOWER(name) = LOWER($2)', [role, role]);
    targetRole = rRes.rows[0];
  }

  const newName = name && typeof name === 'string' ? name.trim() : null;
  const newRoleSlug = targetRole ? targetRole.slug : null;
  const newRoleId = targetRole ? targetRole.id : null;
  const newOpdId = opd_id !== undefined ? opd_id : null;
  const newIsActive = typeof is_active === 'boolean' ? is_active : null;

  // Multi-tenant OPD scoping: non-admin tidak boleh kehilangan ikatan OPD, dan opd_id harus valid
  if (opd_id !== undefined) {
    const effectiveRole = newRoleSlug || targetUser.role;
    if (opd_id === null || opd_id === '') {
      if (effectiveRole !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Pengguna non-admin wajib memiliki Induk Unit Kerja (OPD)'
        });
      }
    } else {
      if (typeof opd_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opd_id)) {
        return res.status(400).json({
          success: false,
          message: 'ID OPD tidak valid'
        });
      }
      const opdRes = await query('SELECT id FROM opds WHERE id = $1 AND deleted_at IS NULL', [opd_id]);
      if (opdRes.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit kerja (OPD) tidak ditemukan'
        });
      }
    }
  }

  const updateRes = await query(
    `UPDATE users
     SET name = COALESCE($1, name),
         role = COALESCE($2, role),
         role_id = COALESCE($3, role_id),
         opd_id = CASE WHEN $4::text IS NULL THEN opd_id ELSE NULLIF($4, '')::uuid END,
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
     WHERE id = $6
     RETURNING id, username, name, role, role_id, opd_id, is_active, updated_at`,
    [newName, newRoleSlug, newRoleId, newOpdId, newIsActive, id]
  );

  logger.info(`Data pengguna '${targetUser.username}' diperbarui oleh ${req.user.username}`);

  res.json({
    success: true,
    message: 'Data pengguna berhasil diperbarui',
    data: updateRes.rows[0]
  });
}

/**
 * PUT /admin/users/:id/password
 * Reset/Change user password
 */
async function changePassword(req, res) {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password baru minimal 6 karakter'
    });
  }

  const userRes = await query('SELECT id, username, password_hash FROM users WHERE id = $1', [id]);
  if (userRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Pengguna tidak ditemukan'
    });
  }

  const targetUser = userRes.rows[0];

  // If non-admin is changing password, verify old password
  if (req.user.id === targetUser.id && req.user.role !== 'admin') {
    if (!oldPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama wajib diisi'
      });
    }

    const match = await bcrypt.compare(oldPassword, targetUser.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Password lama tidak sesuai'
      });
    }
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, id]);

  logger.info(`Password untuk pengguna '${targetUser.username}' telah diubah`);

  res.json({
    success: true,
    message: 'Password berhasil diperbarui'
  });
}

/**
 * DELETE /admin/users/:id
 * Permanently delete user
 */
async function deleteUser(req, res) {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({
      success: false,
      message: 'Anda tidak dapat menghapus akun sendiri'
    });
  }

  const userRes = await query('SELECT id, username FROM users WHERE id = $1', [id]);
  if (userRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Pengguna tidak ditemukan'
    });
  }

  await query('DELETE FROM users WHERE id = $1', [id]);

  logger.info(`Pengguna '${userRes.rows[0].username}' telah dihapus oleh ${req.user.username}`);

  res.json({
    success: true,
    message: 'Pengguna berhasil dihapus'
  });
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  changePassword,
  deleteUser
};
