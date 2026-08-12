'use strict';

const { query } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * Helper to slugify role name
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '_');
}

/**
 * GET /admin/roles - List all roles with user count and assigned permissions
 */
async function listRoles(req, res) {
  const sql = `
    SELECT 
      r.id, 
      r.name, 
      r.slug, 
      r.description, 
      r.is_system, 
      r.created_at, 
      r.updated_at,
      COUNT(DISTINCT u.id)::int AS user_count,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT('id', p.id, 'code', p.code, 'name', p.name, 'category', p.category)
        ) FILTER (WHERE p.id IS NOT NULL), '[]'
      ) AS permissions
    FROM roles r
    LEFT JOIN users u ON u.role_id = r.id AND u.is_active = true
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.name ASC;
  `;

  const result = await query(sql);
  res.json({
    success: true,
    data: result.rows
  });
}

/**
 * GET /admin/permissions - List all available permissions grouped by category
 */
async function listPermissions(req, res) {
  const sql = `
    SELECT id, code, name, category, description
    FROM permissions
    ORDER BY category ASC, name ASC;
  `;

  const result = await query(sql);

  // Group permissions by category for cleaner UI rendering
  const grouped = result.rows.reduce((acc, perm) => {
    const cat = perm.category || 'Umum';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {});

  res.json({
    success: true,
    data: result.rows,
    categories: grouped
  });
}

/**
 * POST /admin/roles - Create a new dynamic role
 */
async function createRole(req, res) {
  const { name, description, permission_ids } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama peran wajib diisi'
    });
  }

  const cleanName = name.trim();
  const slug = slugify(cleanName);

  if (!slug) {
    return res.status(400).json({
      success: false,
      message: 'Nama peran tidak valid'
    });
  }

  // Check if role name or slug already exists
  const checkRes = await query('SELECT id FROM roles WHERE slug = $1 OR LOWER(name) = LOWER($2)', [slug, cleanName]);
  if (checkRes.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Peran dengan nama '${cleanName}' sudah ada`
    });
  }

  // Insert role
  const roleRes = await query(
    `INSERT INTO roles (name, slug, description, is_system)
     VALUES ($1, $2, $3, false)
     RETURNING id, name, slug, description, is_system, created_at`,
    [cleanName, slug, description || '']
  );

  const newRole = roleRes.rows[0];

  // Attach permissions if provided
  if (Array.isArray(permission_ids) && permission_ids.length > 0) {
    const insertValues = permission_ids.map((pId, idx) => `($1, $${idx + 2})`).join(', ');
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ${insertValues} ON CONFLICT DO NOTHING`,
      [newRole.id, ...permission_ids]
    );
  }

  logger.info(`Role baru '${newRole.name}' (${newRole.slug}) berhasil dibuat oleh '${req.user?.username}'`);

  res.status(201).json({
    success: true,
    message: `Peran '${newRole.name}' berhasil dibuat`,
    data: newRole
  });
}

/**
 * PUT /admin/roles/:id - Update dynamic role name, description, and permissions
 */
async function updateRole(req, res) {
  const { id } = req.params;
  const { name, description, permission_ids } = req.body;

  const roleRes = await query('SELECT id, name, slug, is_system FROM roles WHERE id = $1', [id]);
  const existingRole = roleRes.rows[0];

  if (!existingRole) {
    return res.status(404).json({
      success: false,
      message: 'Peran tidak ditemukan'
    });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama peran wajib diisi'
    });
  }

  const cleanName = name.trim();

  // Check duplicate name
  const dupRes = await query(
    'SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2',
    [cleanName, id]
  );
  if (dupRes.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Nama peran '${cleanName}' telah digunakan oleh peran lain`
    });
  }

  // Update role info
  await query(
    `UPDATE roles
     SET name = $1, description = $2, updated_at = NOW()
     WHERE id = $3`,
    [cleanName, description || '', id]
  );

  // Sync permissions
  if (Array.isArray(permission_ids)) {
    await query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    if (permission_ids.length > 0) {
      const insertValues = permission_ids.map((pId, idx) => `($1, $${idx + 2})`).join(', ');
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${insertValues} ON CONFLICT DO NOTHING`,
        [id, ...permission_ids]
      );
    }
  }

  logger.info(`Role '${existingRole.name}' (ID: ${id}) diperbarui oleh '${req.user?.username}'`);

  res.json({
    success: true,
    message: `Peran '${cleanName}' berhasil diperbarui`
  });
}

/**
 * DELETE /admin/roles/:id - Delete custom dynamic role
 */
async function deleteRole(req, res) {
  const { id } = req.params;

  const roleRes = await query('SELECT id, name, slug, is_system FROM roles WHERE id = $1', [id]);
  const role = roleRes.rows[0];

  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Peran tidak ditemukan'
    });
  }

  if (role.is_system) {
    return res.status(400).json({
      success: false,
      message: `Peran sistem bawaan '${role.name}' tidak dapat dihapus`
    });
  }

  // Check if users are currently using this role
  const userCheck = await query('SELECT COUNT(*)::int AS count FROM users WHERE role_id = $1 AND is_active = true', [id]);
  const assignedUsersCount = userCheck.rows[0]?.count || 0;

  if (assignedUsersCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Peran '${role.name}' tidak dapat dihapus karena masih digunakan oleh ${assignedUsersCount} pengguna aktif`
    });
  }

  await query('DELETE FROM roles WHERE id = $1', [id]);

  logger.info(`Role '${role.name}' (ID: ${id}) dihapus oleh '${req.user?.username}'`);

  res.json({
    success: true,
    message: `Peran '${role.name}' berhasil dihapus`
  });
}

module.exports = {
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole
};
