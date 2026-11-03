'use strict';

const fs = require('fs');
const photoService = require('../../services/photoService');
const queries = require('../../db/queries');
const pdfService = require('../../services/pdfService');
const { canAccessOpd, resolveScopedOpdIds } = require('../../middleware/apiKeyAuth');

// Data Retrieval Routes (getAttendanceLogs)
exports.getAttendanceLogs = async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const sn = req.query.sn || null;
  const pin = req.query.pin || null;
  const year = req.query.year || null;
  const month = req.query.month || null;
  const startDate = req.query.startDate || null;
  const endDate = req.query.endDate || null;
  const search = req.query.search || null;

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

  const result = await queries.getAttendanceLogs(limit, offset, sn, pin, year, month, startDate, endDate, search, opdScope);
  res.json({
    success: true,
    data: result.data,
    total: result.total,
    limit,
    offset
  });
};

// Export Attendance PDF Report
exports.exportAttendancePdf = async (req, res) => {
  const pin = req.query.pin;
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  const preview = req.query.preview === 'true' || req.query.preview === '1';
  const signatoryName = req.query.signatoryName || '';
  const signatoryNip = req.query.signatoryNip || '';
  const signatoryTitle = req.query.signatoryTitle || '';
  const location = req.query.location || '';

  if (!pin) {
    return res.status(400).json({
      success: false,
      message: 'Parameter "pin" diperlukan'
    });
  }

  if (!year || isNaN(year) || !month || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: 'Parameter "year" dan "month" (1-12) yang valid diperlukan'
    });
  }

  const opdScope = await resolveScopedOpdIds(req.user);

  // Non-admin without OPD cannot export
  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda tidak terikat dengan OPD mana pun'
    });
  }

  // Get Pegawai info with OPD scoping check
  const pegawai = await queries.getPegawaiProfileForExport(pin, opdScope);
  if (!pegawai) {
    return res.status(404).json({
      success: false,
      message: 'Data pegawai tidak ditemukan atau berada di luar unit kerja (OPD) Anda'
    });
  }

  // Calculate month date range: [YYYY-MM-01, nextMonth-01)
  const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  let nextY = year;
  let nextM = month + 1;
  if (nextM > 12) {
    nextM = 1;
    nextY += 1;
  }
  const endStr = `${nextY}-${String(nextM).padStart(2, '0')}-01 00:00:00`;

  // Fetch monthly attendance logs
  const logs = await queries.getMonthlyLogsForPegawai(pin, startStr, endStr, opdScope);

  // Generate PDF buffer
  const pdfBuffer = await pdfService.generateAttendancePdf({
    pegawai,
    logs,
    year,
    month,
    signatory: {
      name: signatoryName,
      nip: signatoryNip,
      title: signatoryTitle
    },
    location
  });

  const filename = `Rekap_Presensi_${pin}_${year}-${String(month).padStart(2, '0')}.pdf`;
  const disposition = preview ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
};

// =========================================================
// ATTENDANCE PHOTOS ENDPOINTS
// =========================================================

exports.getRecentAttendancePhotos = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 30);
  const sn = req.query.sn || null;
  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({
      success: true,
      photos: []
    });
  }

  const rows = await queries.getRecentAttendancePhotos({ limit, opdId: opdScope, sn });
  const photos = rows.map(r => ({
    ...r,
    photo_url: `/admin/attendance-photos/${r.id}`
  }));

  res.json({
    success: true,
    photos
  });
};

exports.getAttendancePhotoFile = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid photo ID'
    });
  }

  const photo = await queries.getAttendancePhotoById(id);
  if (!photo) {
    return res.status(404).json({
      success: false,
      message: 'Foto absensi tidak ditemukan'
    });
  }

  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const allowed = canAccessOpd(req.user, photo.device_opd_id) || canAccessOpd(req.user, photo.pegawai_opd_id);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke foto absensi unit kerja ini'
      });
    }
  }

  const absolutePath = photoService.resolvePhotoAbsolutePath(photo.file_path);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({
      success: false,
      message: 'Berkas fisik foto absensi tidak ditemukan di server'
    });
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  const stream = fs.createReadStream(absolutePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).end();
    }
  });
  stream.pipe(res);
};
