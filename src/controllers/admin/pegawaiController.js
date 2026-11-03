'use strict';

const userService = require('../../services/userService');
const queries = require('../../db/queries');
const { resolveScopedOpdIds } = require('../../middleware/apiKeyAuth');

// Data Retrieval Routes (getpegawai)
exports.getPegawai = async (req, res) => {
  const { pin } = req.params;
  const opdScope = await resolveScopedOpdIds(req.user);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda belum terikat ke unit kerja (OPD)'
    });
  }

  const pegawai = await userService.getPegawaiWithFingerprints(pin, opdScope);

  if (!pegawai) {
    return res.status(404).json({
      success: false,
      message: `Pegawai not found: ${pin}`
    });
  }

  res.json({
    success: true,
    pegawai
  });
};

// Data Retrieval Routes (listPegawai with pagination and OPD scoping)
exports.listPegawai = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const search = req.query.search ? req.query.search.trim() : null;

  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({
      success: true,
      data: [],
      total: 0,
      limit,
      offset
    });
  }

  const result = await queries.listPegawai({ limit, offset, search, opdId: opdScope });
  res.json({
    success: true,
    data: result.rows,
    total: result.total,
    limit,
    offset
  });
};

// Data Retrieval Routes (searchPegawai by name)
exports.searchPegawai = async (req, res) => {
  const { q, limit } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Missing query parameter: q'
    });
  }

  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({
      success: true,
      query: q.trim(),
      count: 0,
      results: []
    });
  }

  const results = await queries.searchPegawaiByName(q.trim(), limit ? parseInt(limit) : 10, opdScope);
  res.json({
    success: true,
    query: q.trim(),
    count: results.length,
    results
  });
};

exports.getPegawaiByDevice = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  let limit = null;
  if (req.query.limit !== undefined) {
    const parsed = parseInt(req.query.limit, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      limit = parsed;
    }
  }

  let offset = null;
  if (req.query.offset !== undefined) {
    const parsed = parseInt(req.query.offset, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  const search = req.query.search || null;

  const result = await userService.getPegawaiByDevice(sn, limit, offset, search);
  res.json({
    success: true,
    device: {
      sn: device.sn,
      name: device.name,
      device_name: device.device_name,
      status: device.status,
      last_activity: device.last_activity,
      ip_address: device.ip_address,
      verified: device.verified
    },
    count: result.count,
    total: result.total,
    pegawai: result.rows
  });
};
