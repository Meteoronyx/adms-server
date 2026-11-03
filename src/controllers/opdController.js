'use strict';

const { query } = require('../db/connection');
const logger = require('../utils/logger');
const { canAccessOpd, resolveScopedOpdIds } = require('../middleware/apiKeyAuth');

/**
 * GET /admin/opds
 * List all OPDs with search, pagination, or dropdown support
 */
async function listOpds(req, res) {
  const { search, all, page = 1, limit = 50 } = req.query;
  const isSystemAdmin = req.user.role === 'admin';
  const opdScope = !isSystemAdmin ? await resolveScopedOpdIds(req.user) : null;

  if (!isSystemAdmin && (!opdScope || opdScope.length === 0)) {
    if (all === 'true') {
      return res.json({ success: true, data: [] });
    }
    return res.json({
      success: true,
      data: [],
      pagination: { total: 0, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: 0 }
    });
  }

  if (all === 'true') {
    const params = [];
    let whereSql = 'WHERE o.deleted_at IS NULL';
    if (opdScope) {
      params.push(opdScope);
      whereSql += ` AND o.id = ANY($${params.length}::uuid[])`;
    }

    const result = await query(
      `SELECT 
         o.id,
         o.kdunker,
         o.nama_opd,
         o.latitude,
         o.longitude,
         o.radius,
         o.ip_public,
         (o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15) AS is_induk,
         po.id AS parent_opd_id,
         po.nama_opd AS parent_nama_opd
       FROM opds o
       LEFT JOIN opds po ON o.kdunker IS NOT NULL
         AND NOT (o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15)
         AND po.kdunker = SUBSTRING(o.kdunker FROM 1 FOR 4) || '00000000000'
         AND po.deleted_at IS NULL
       ${whereSql}
       ORDER BY is_induk DESC, o.nama_opd ASC`,
      params
    );
    return res.json({
      success: true,
      data: result.rows
    });
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const searchFilter = search ? search.trim() : null;

  let countQuery = 'SELECT COUNT(*)::int AS count FROM opds o WHERE o.deleted_at IS NULL';
  let dataQuery = `
    SELECT 
      o.id,
      o.kdunker,
      o.nama_opd,
      o.latitude,
      o.longitude,
      o.radius,
      o.ip_public,
      o.created_at,
      o.updated_at,
      (o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15) AS is_induk,
      po.id AS parent_opd_id,
      po.nama_opd AS parent_nama_opd,
      CASE
        WHEN o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15 THEN (
          SELECT COUNT(*)::int FROM opds sub
          WHERE sub.deleted_at IS NULL
            AND sub.id != o.id
            AND sub.kdunker LIKE SUBSTRING(o.kdunker FROM 1 FOR 4) || '%'
        )
        ELSE 0
      END AS sub_count
    FROM opds o
    LEFT JOIN opds po ON o.kdunker IS NOT NULL
      AND NOT (o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15)
      AND po.kdunker = SUBSTRING(o.kdunker FROM 1 FOR 4) || '00000000000'
      AND po.deleted_at IS NULL
    WHERE o.deleted_at IS NULL
  `;

  const params = [];
  if (opdScope) {
    params.push(opdScope);
    countQuery += ` AND o.id = ANY($${params.length}::uuid[])`;
    dataQuery += ` AND o.id = ANY($${params.length}::uuid[])`;
  }

  if (searchFilter) {
    params.push(`%${searchFilter}%`);
    countQuery += ` AND (o.nama_opd ILIKE $${params.length} OR o.kdunker ILIKE $${params.length})`;
    dataQuery += ` AND (o.nama_opd ILIKE $${params.length} OR o.kdunker ILIKE $${params.length})`;
  }

  dataQuery += ' ORDER BY is_induk DESC, o.nama_opd ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  const dataParams = [...params, parseInt(limit, 10), offset];

  const [countRes, dataRes] = await Promise.all([
    query(countQuery, params),
    query(dataQuery, dataParams)
  ]);

  const total = countRes.rows[0]?.count || 0;

  res.json({
    success: true,
    data: dataRes.rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit)
    }
  });
}

/**
 * GET /admin/opds/:id
 * Get single OPD details
 */
async function getOpd(req, res) {
  const { id } = req.params;

  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const owned = canAccessOpd(req.user, id);
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'OPD tidak berada di unit kerja Anda'
      });
    }
  }

  const result = await query(
    `SELECT 
       o.id,
       o.kdunker,
       o.nama_opd,
       o.latitude,
       o.longitude,
       o.radius,
       o.ip_public,
       o.created_at,
       o.updated_at,
       (o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15) AS is_induk,
       po.id AS parent_opd_id,
       po.nama_opd AS parent_nama_opd
     FROM opds o
     LEFT JOIN opds po ON o.kdunker IS NOT NULL
       AND NOT (o.kdunker LIKE '%00000000000' AND length(o.kdunker) = 15)
       AND po.kdunker = SUBSTRING(o.kdunker FROM 1 FOR 4) || '00000000000'
       AND po.deleted_at IS NULL
     WHERE o.id = $1 AND o.deleted_at IS NULL`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'OPD tidak ditemukan'
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
}

/**
 * POST /admin/opds
 * Create new OPD
 */
async function createOpd(req, res) {
  const { kdunker, nama_opd, latitude, longitude, radius = 80, ip_public } = req.body;

  if (!kdunker || typeof kdunker !== 'string' || kdunker.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Kode Unit Kerja (kdunker) wajib diisi'
    });
  }

  if (!nama_opd || typeof nama_opd !== 'string' || nama_opd.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Nama OPD wajib diisi'
    });
  }

  const cleanKdunker = kdunker.trim();
  const cleanNamaOpd = nama_opd.trim();

  // Check unique kdunker
  const existing = await query('SELECT id FROM opds WHERE kdunker = $1 AND deleted_at IS NULL', [cleanKdunker]);
  if (existing.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Kode unit kerja '${cleanKdunker}' sudah terdaftar`
    });
  }

  const result = await query(
    `INSERT INTO opds (kdunker, nama_opd, latitude, longitude, radius, ip_public)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, kdunker, nama_opd, latitude, longitude, radius, ip_public, created_at`,
    [cleanKdunker, cleanNamaOpd, latitude || null, longitude || null, radius, ip_public || null]
  );

  // Sync parent_id if applicable
  try {
    if (cleanKdunker.length >= 4 && !(cleanKdunker.length === 15 && cleanKdunker.endsWith('00000000000'))) {
      const parentKdunker = `${cleanKdunker.substring(0, 4)}00000000000`;
      await query(
        `UPDATE opds SET parent_id = (SELECT id FROM opds WHERE kdunker = $1 AND deleted_at IS NULL LIMIT 1) WHERE id = $2`,
        [parentKdunker, result.rows[0].id]
      );
    }
  } catch (_) {
    // Ignore if parent_id column not yet migrated
  }

  logger.info(`OPD baru '${cleanNamaOpd}' (${cleanKdunker}) berhasil ditambahkan oleh ${req.user.username}`);

  res.status(201).json({
    success: true,
    message: 'OPD berhasil ditambahkan',
    data: result.rows[0]
  });
}

/**
 * PUT /admin/opds/:id
 * Update OPD details
 */
async function updateOpd(req, res) {
  const { id } = req.params;
  const { kdunker, nama_opd, latitude, longitude, radius, ip_public } = req.body;

  const checkRes = await query('SELECT id, nama_opd FROM opds WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (checkRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'OPD tidak ditemukan'
    });
  }

  if (kdunker) {
    const existing = await query('SELECT id FROM opds WHERE kdunker = $1 AND id != $2 AND deleted_at IS NULL', [kdunker.trim(), id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Kode unit kerja '${kdunker.trim()}' sudah digunakan oleh OPD lain`
      });
    }
  }

  const updateRes = await query(
    `UPDATE opds
     SET kdunker = COALESCE($1, kdunker),
         nama_opd = COALESCE($2, nama_opd),
         latitude = COALESCE($3, latitude),
         longitude = COALESCE($4, longitude),
         radius = COALESCE($5, radius),
         ip_public = COALESCE($6, ip_public),
         updated_at = NOW()
     WHERE id = $7
     RETURNING id, kdunker, nama_opd, latitude, longitude, radius, ip_public, updated_at`,
    [
      kdunker ? kdunker.trim() : null,
      nama_opd ? nama_opd.trim() : null,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      radius !== undefined ? radius : null,
      ip_public !== undefined ? ip_public : null,
      id
    ]
  );

  // Sync parent_id if kdunker updated
  try {
    const updatedKdunker = updateRes.rows[0].kdunker;
    if (updatedKdunker && updatedKdunker.length >= 4 && !(updatedKdunker.length === 15 && updatedKdunker.endsWith('00000000000'))) {
      const parentKdunker = `${updatedKdunker.substring(0, 4)}00000000000`;
      await query(
        `UPDATE opds SET parent_id = (SELECT id FROM opds WHERE kdunker = $1 AND deleted_at IS NULL LIMIT 1) WHERE id = $2`,
        [parentKdunker, id]
      );
    }
  } catch (_) {
    // Ignore if parent_id column not yet migrated
  }

  logger.info(`OPD '${updateRes.rows[0].nama_opd}' diperbarui oleh ${req.user.username}`);

  res.json({
    success: true,
    message: 'OPD berhasil diperbarui',
    data: updateRes.rows[0]
  });
}

/**
 * DELETE /admin/opds/:id
 * Soft delete OPD
 */
async function deleteOpd(req, res) {
  const { id } = req.params;

  const checkRes = await query('SELECT id, nama_opd FROM opds WHERE id = $1 AND deleted_at IS NULL', [id]);
  if (checkRes.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'OPD tidak ditemukan'
    });
  }

  await query('UPDATE opds SET deleted_at = NOW() WHERE id = $1', [id]);

  logger.info(`OPD '${checkRes.rows[0].nama_opd}' dinonaktifkan oleh ${req.user.username}`);

  res.json({
    success: true,
    message: 'OPD berhasil dihapus'
  });
}

/**
 * POST /admin/opds/auto-map
 * Trigger auto-mapping of existing devices, users, and pegawai to OPDs
 */
async function triggerAutoMap(req, res) {
  const { autoMapOpdData } = require('../db/autoMapOpd');
  const result = await autoMapOpdData();

  res.json({
    success: true,
    message: `Auto-mapping OPD selesai. ${result.mappedSubOpds || 0} sub-unit, ${result.mappedDevices} perangkat, ${result.mappedUsers} pengguna, dan ${result.mappedPegawai} pegawai berhasil dipetakan secara otomatis.`,
    data: result
  });
}

module.exports = {
  listOpds,
  getOpd,
  createOpd,
  updateOpd,
  deleteOpd,
  triggerAutoMap
};
