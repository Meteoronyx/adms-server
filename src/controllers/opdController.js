'use strict';

const { query } = require('../db/connection');
const logger = require('../utils/logger');

/**
 * GET /admin/opds
 * List all OPDs with search, pagination, or dropdown support
 */
async function listOpds(req, res) {
  const { search, all, page = 1, limit = 50 } = req.query;
  const isSystemAdmin = req.user.role === 'admin';

  // Multi-tenant OPD scoping: non-admin hanya dapat melihat OPD miliknya sendiri
  if (!isSystemAdmin) {
    const ownOpdId = req.user.opd_id || null;
    if (all === 'true') {
      if (!ownOpdId) return res.json({ success: true, data: [] });
      const result = await query(
        `SELECT id, kdunker, nama_opd
         FROM opds
         WHERE id = $1 AND deleted_at IS NULL`,
        [ownOpdId]
      );
      return res.json({ success: true, data: result.rows });
    }
    if (!ownOpdId) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: 0 }
      });
    }
    const ownResult = await query(
      `SELECT id, kdunker, nama_opd, latitude, longitude, radius, ip_public, created_at, updated_at
       FROM opds
       WHERE id = $1 AND deleted_at IS NULL`,
      [ownOpdId]
    );
    return res.json({
      success: true,
      data: ownResult.rows,
      pagination: { total: ownResult.rows.length, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: 1 }
    });
  }

  if (all === 'true') {
    const result = await query(
      `SELECT id, kdunker, nama_opd, latitude, longitude, radius, ip_public
       FROM opds
       WHERE deleted_at IS NULL
       ORDER BY nama_opd ASC`
    );
    return res.json({
      success: true,
      data: result.rows
    });
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const searchFilter = search ? search.trim() : null;

  let countQuery = 'SELECT COUNT(*)::int AS count FROM opds WHERE deleted_at IS NULL';
  let dataQuery = `
    SELECT id, kdunker, nama_opd, latitude, longitude, radius, ip_public, created_at, updated_at
    FROM opds
    WHERE deleted_at IS NULL
  `;

  const params = [];
  if (searchFilter) {
    params.push(`%${searchFilter}%`);
    countQuery += ' AND (nama_opd ILIKE $1 OR kdunker ILIKE $1)';
    dataQuery += ' AND (nama_opd ILIKE $1 OR kdunker ILIKE $1)';
  }

  dataQuery += ' ORDER BY nama_opd ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
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
    const owned = !!req.user.opd_id && req.user.opd_id === id;
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'OPD tidak berada di unit kerja Anda'
      });
    }
  }

  const result = await query(
    `SELECT id, kdunker, nama_opd, latitude, longitude, radius, ip_public, created_at, updated_at
     FROM opds
     WHERE id = $1 AND deleted_at IS NULL`,
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
    message: `Auto-mapping OPD selesai. ${result.mappedDevices} perangkat, ${result.mappedUsers} pengguna, dan ${result.mappedPegawai} pegawai berhasil dipetakan secara otomatis.`,
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
