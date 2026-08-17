'use strict';

const config = require('../config');
const reuploadService = require('../services/reuploadService');
const commandService = require('../services/commandService');
const userService = require('../services/userService');
const queries = require('../db/queries');
const pdfService = require('../services/pdfService');
const logger = require('../utils/logger');

// Reupload Logic
exports.reuploadDevice = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  reuploadService.addToQueue(sn);
  logger.info('Device queued for reupload', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.REUPLOAD_QUEUED} ${sn}`,
    device: {
      sn: device.sn,
      name: device.name,
      lastActivity: device.last_activity,
      status: device.status
    }
  });
};

exports.getReuploadQueue = async (req, res) => {
  const queue = reuploadService.getQueueStatus();

  // Multi-tenant OPD scoping: non-admin hanya melihat antrian reupload perangkat OPD-nya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin && !req.user.opd_id) {
    return res.json({ success: true, queue: {} });
  }
  if (!isSystemAdmin && req.user.opd_id) {
    const sns = Object.keys(queue);
    const scopedQueue = {};
    for (const sn of sns) {
      const device = await queries.getDeviceInfo(sn);
      if (device && device.opd_id === req.user.opd_id) {
        scopedQueue[sn] = queue[sn];
      }
    }
    return res.json({ success: true, queue: scopedQueue });
  }

  res.json({
    success: true,
    queue
  });
};

// Device Verification
exports.verifyDevice = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  // Validasi: pastikan device_name sudah diisi sebelum verifikasi
  if (!device.device_name || !device.device_name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama perangkat wajib diisi terlebih dahulu sebelum melakukan verifikasi'
    });
  }

  await queries.verifyDevice(sn);
  logger.info('Device verified via API', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `Device ${sn} has been verified`,
    device: {
      sn: device.sn,
      name: device.name,
      device_name: device.device_name,
      verified: true
    }
  });
};

exports.unverifyDevice = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  await queries.unverifyDevice(sn);
  logger.info('Device unverified via API', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `Device ${sn} has been unverified`,
    device: {
      sn: device.sn,
      name: device.name,
      verified: false
    }
  });
};

exports.listDevices = async (req, res) => {
  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  // Multi-tenant OPD scoping: non-admin tanpa OPD tidak melihat data apa pun
  if (!isSystemAdmin && !opdId) {
    return res.json({
      success: true,
      devices: [],
      offlineDevices: []
    });
  }

  const devices = await queries.getAllDevices(opdId);
  const offlineDevices = await queries.getOfflineDevices(opdId);

  res.json({
    success: true,
    devices,
    offlineDevices
  });
};

exports.updateDeviceName = async (req, res) => {
  const { sn } = req.params;
  const { device_name } = req.body;

  // Check device exists
  const device = await queries.getDeviceInfo(sn);
  if (!device) {
    return res.status(404).json({
      success: false,
      message: `Device not found: ${sn}`
    });
  }

  // Multi-tenant OPD scoping: non-admin hanya boleh mengubah perangkat milik OPD-nya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const owned = !!req.user.opd_id && device.opd_id === req.user.opd_id;
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat tidak berada di unit kerja (OPD) Anda'
      });
    }
  }

  if (device_name && device_name.trim()) {
    await queries.updateDeviceName(sn, device_name.trim());
  }

  const updatedDevice = await queries.getDeviceInfo(sn);
  logger.info('Device details updated via API', { sn, device_name, ip: req.ip });

  res.json({
    success: true,
    message: `Device ${sn} details updated`,
    device: updatedDevice
  });
};


// Device Commands (clearlog)
exports.clearLog = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  await commandService.queueCommand(sn, config.COMMAND_TYPES.CLEAR_LOG);
  logger.info('Clear log command queued', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: CLEAR LOG`,
    device: { sn: device.sn, name: device.name }
  });
};

// Device Commands (info)
exports.info = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  await commandService.queueCommand(sn, config.COMMAND_TYPES.INFO);
  logger.info('Info command queued', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: INFO`,
    device: { sn: device.sn, name: device.name }
  });
};

// Device Commands (reboot)
exports.reboot = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  await commandService.queueCommand(sn, config.COMMAND_TYPES.REBOOT);
  logger.info('Reboot command queued', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: REBOOT`,
    device: { sn: device.sn, name: device.name }
  });
};

// Device Commands (updateuser)
exports.updateUser = async (req, res) => {
  const { sn } = req.params;
  const { pin, privilege, passwd, name } = req.body;
  const device = req.device;

  if (pin === undefined || pin === null) {
    return res.status(400).json({
      success: false,
      message: config.RESPONSE.ADMIN.MISSING_PIN
    });
  }

  if (privilege === undefined || privilege === null) {
    return res.status(400).json({
      success: false,
      message: config.RESPONSE.ADMIN.MISSING_PRIVILEGE
    });
  }

  const params = {
    pin: parseInt(pin),
    privilege: parseInt(privilege)
  };

  if (passwd !== undefined && passwd !== null && passwd !== '') {
    params.passwd = parseInt(passwd);
  }

  if (name !== undefined && name !== null && name !== '') {
    params.name = String(name).trim();
  }

  await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_USER, params);
  logger.info('Update user command queued', { sn, pin, privilege, passwd, name: params.name, ip: req.ip });

  // Optimistic DB update: update privilege and password immediately
  try {
    const deviceName = device?.device_name || device?.name || null;
    await queries.upsertPegawaiDeviceMapping(
      String(pin),
      sn,
      deviceName,
      parseInt(privilege),
      passwd !== undefined && passwd !== null && passwd !== '' ? String(passwd) : null
    );
    logger.info('Optimistic update applied for pegawai device mapping', { pin, sn, privilege });
  } catch (err) {
    logger.error('Failed to apply optimistic update for pegawai device mapping', { pin, sn, error: err.message });
  }

  // Optimistic DB update: update pegawai name if provided
  if (params.name) {
    try {
      await queries.upsertPegawai({
        pin: String(pin),
        name: params.name,
        card: null,
        groupNo: null,
        timezone: null,
        verifyMode: null
      });
      logger.info('Optimistic update applied for pegawai name', { pin, name: params.name });
    } catch (err) {
      logger.error('Failed to apply optimistic update for pegawai name', { pin, error: err.message });
    }
  }

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: UPDATE USER`,
    device: { sn: device.sn, name: device.name },
    params: { pin, privilege, ...(params.name ? { name: params.name } : {}), ...(passwd !== undefined && passwd !== null && passwd !== '' ? { passwd: parseInt(passwd) } : {}) }
  });
};

// Device Commands (deleteuser)
exports.deleteUser = async (req, res) => {
  const { sn, pin } = req.params;
  const device = req.device;

  await commandService.queueCommand(sn, config.COMMAND_TYPES.DELETE_USER, {
    pin: parseInt(pin)
  });
  logger.info('Delete user command queued', { sn, pin, ip: req.ip });

  // Optimistic DB update: soft-delete mapping & fingerprints immediately
  // Queue command__ → kirim perintah hapus ke device (biar user di mesin kehapus)\
  // Update DB langsung__ (biar status di database sesuai)\
  // Kalau device sync balik__ → otomatis restore jika user ternyata masih ada
  await queries.softDeletePegawaiDeviceMapping(pin, sn);
  await queries.deletePegawaiFingerprints(pin, sn);
  logger.info('Optimistic soft-delete applied for pegawai device mapping', { pin, sn });

  // If pegawai has no remaining active mappings, soft-delete globally
  const activeCount = await queries.countActiveDeviceMappings(pin);
  if (activeCount === 0) {
    await queries.softDeletePegawai(pin);
    logger.info('Pegawai has no remaining active mappings. Soft-deleted globally.', { pin });
  }

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: DELETE USER`,
    device: { sn: device.sn, name: device.name },
    params: { pin }
  });
};

// Device Commands (enrollfp)
exports.enrollFingerprint = async (req, res) => {
  const { sn } = req.params;
  const { pin, fid, retry, overwrite } = req.body;
  const device = req.device;

  if (pin === undefined || pin === null) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: pin'
    });
  }

  if (fid === undefined || fid === null) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: fid'
    });
  }

  await commandService.queueCommand(sn, config.COMMAND_TYPES.ENROLL_FP, {
    pin: parseInt(pin),
    fid: parseInt(fid),
    retry: retry !== undefined ? parseInt(retry) : 1,
    overwrite: overwrite !== undefined ? parseInt(overwrite) : 0
  });

  logger.info('Enroll fingerprint command queued', {
    sn,
    pin,
    fid,
    retry: retry !== undefined ? parseInt(retry) : 1,
    overwrite: overwrite !== undefined ? parseInt(overwrite) : 0,
    ip: req.ip
  });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: ENROLL_FP`,
    device: { sn: device.sn, name: device.name },
    params: {
      pin: parseInt(pin),
      fid: parseInt(fid),
      retry: retry !== undefined ? parseInt(retry) : 1,
      overwrite: overwrite !== undefined ? parseInt(overwrite) : 0
    }
  });
};

// Device Commands (getcommandqueue)
exports.getCommandQueue = async (req, res) => {
  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  if (!isSystemAdmin && !opdId) {
    return res.json({ success: true, commands: [] });
  }

  const commands = await commandService.getQueueStatus(opdId);
  res.json({
    success: true,
    commands
  });
};

// Data Retrieval Routes (getpegawai)
exports.getPegawai = async (req, res) => {
  const { pin } = req.params;
  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  if (!isSystemAdmin && !opdId) {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda belum terikat ke unit kerja (OPD)'
    });
  }

  const pegawai = await userService.getPegawaiWithFingerprints(pin, opdId);

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

  const isSystemAdmin = req.user.role === 'admin';
  let opdId = null;
  if (isSystemAdmin) {
    opdId = req.query.opd_id ? req.query.opd_id.trim() : null;
  } else {
    opdId = req.user.opd_id || null;
  }

  if (!isSystemAdmin && !opdId) {
    return res.json({
      success: true,
      data: [],
      total: 0,
      limit,
      offset
    });
  }

  const result = await queries.listPegawai({ limit, offset, search, opdId });
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

  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  if (!isSystemAdmin && !opdId) {
    return res.json({
      success: true,
      query: q.trim(),
      count: 0,
      results: []
    });
  }

  const results = await queries.searchPegawaiByName(q.trim(), limit ? parseInt(limit) : 10, opdId);
  res.json({
    success: true,
    query: q.trim(),
    count: results.length,
    results
  });
};

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

  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  if (!isSystemAdmin && !opdId) {
    return res.json({
      success: true,
      data: [],
      total: 0,
      limit,
      offset
    });
  }

  const result = await queries.getAttendanceLogs(limit, offset, sn, pin, year, month, startDate, endDate, search, opdId);
  res.json({
    success: true,
    data: result.data,
    total: result.total,
    limit,
    offset
  });
};

// Dashboard statistics
exports.getDashboardStats = async (req, res) => {
  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  if (!isSystemAdmin && !opdId) {
    return res.json({
      success: true,
      stats: {
        total_pegawai: 0,
        total_fingerprints: 0,
        total_admins: 0,
        logs_today: 0,
        logs_weekly: 0,
        logs_monthly: 0
      }
    });
  }

  const stats = await queries.getDashboardStats(opdId);
  res.json({
    success: true,
    stats
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

// Data Retrieval Routes (checkfingerprintondevice)
exports.checkFingerprintOnDevice = async (req, res) => {
  const { pin, sn } = req.query;

  if (!pin || !sn) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: pin and sn'
    });
  }

  // Manually check if device exists since 'sn' is in query, not params
  const device = await queries.getDeviceInfo(sn);
  if (!device) {
    return res.status(404).json({
      success: false,
      message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
    });
  }

  // Multi-tenant OPD scoping: non-admin hanya boleh memeriksa perangkat OPD-nya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const owned = !!req.user.opd_id && device.opd_id === req.user.opd_id;
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat tidak berada di unit kerja (OPD) Anda'
      });
    }
  }

  const fingerprints = await userService.checkFingerprintOnDevice(pin, sn);

  if (fingerprints.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No fingerprints found for pegawai ${pin} at device ${sn}`
    });
  }

  res.json({
    success: true,
    pegawai_pin: pin,
    device: sn,
    count: fingerprints.length,
    fingerprints
  });
};

// Device Commands (transferfp)
exports.transferFingerprint = async (req, res) => {
  const { sn } = req.params; // Target device SN
  const { pin, source_sn } = req.body;
  const targetDevice = req.device; // Checked by middleware

  if (!pin) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: pin'
    });
  }

  if (!source_sn) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: source_sn (source device)'
    });
  }

  // Multi-tenant OPD scoping: non-admin hanya boleh transfer dari perangkat OPD-nya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const sourceDevice = await queries.getDeviceInfo(source_sn);
    if (!sourceDevice) {
      return res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${source_sn}`
      });
    }
    const owned = !!req.user.opd_id && sourceDevice.opd_id === req.user.opd_id;
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat sumber tidak berada di unit kerja (OPD) Anda'
      });
    }
  }

  // Get fingerprints from source device
  const fingerprints = await userService.checkFingerprintOnDevice(pin, source_sn);
  if (fingerprints.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No fingerprints found for pegawai ${pin} at source device ${source_sn}`
    });
  }

  // Get pegawai info for DATA USER line
  const pegawaiInfo = await queries.getPegawaiBasicInfo(pin, source_sn);
  if (!pegawaiInfo) {
    return res.status(404).json({
      success: false,
      message: `Pegawai not found: ${pin}`
    });
  }

  // Queue DATA_FP command for transfer fingerprint
  const queuedCommands = [];
  for (const fp of fingerprints) {
    await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_FP, {
      pin: pin,
      finger_id: fp.finger_id,
      template: fp.template,
      user_info: {
        name: pegawaiInfo.name,
        privilege: pegawaiInfo.privilege,
        timezone: pegawaiInfo.timezone,
        group_no: pegawaiInfo.group_no
      }
    });
    queuedCommands.push(fp.finger_id);
  }

  logger.info('Fingerprint transfer commands queued', {
    target_sn: sn,
    source_sn: source_sn,
    pin: pin,
    finger_ids: queuedCommands,
    ip: req.ip
  });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: DATA_FP (${queuedCommands.length} fingerprints)`,
    target_device: { sn: targetDevice.sn, name: targetDevice.name },
    source_device: source_sn,
    pegawai_pin: pin,
    fingerprints_queued: queuedCommands.length,
    finger_ids: queuedCommands
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

  const isSystemAdmin = req.user.role === 'admin';
  const opdId = !isSystemAdmin ? req.user.opd_id : null;

  // Non-admin without OPD cannot export
  if (!isSystemAdmin && !opdId) {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda tidak terikat dengan OPD mana pun'
    });
  }

  // Get Pegawai info with OPD scoping check
  const pegawai = await queries.getPegawaiProfileForExport(pin, opdId);
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
  const logs = await queries.getMonthlyLogsForPegawai(pin, startStr, endStr, opdId);

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

