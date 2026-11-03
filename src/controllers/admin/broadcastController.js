'use strict';

const config = require('../../config');
const commandService = require('../../services/commandService');
const queries = require('../../db/queries');
const logger = require('../../utils/logger');
const { canAccessOpd, resolveScopedOpdIds } = require('../../middleware/apiKeyAuth');

// BROADCAST MESSAGES (PUBLIC SMS TAG=253) ENDPOINTS
exports.listBroadcastMessages = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const activeOnly = req.query.active === 'true' || req.query.active === '1';

  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({
      success: true,
      messages: [],
      total: 0,
      limit,
      offset
    });
  }

  const result = await queries.listBroadcastMessages({
    opdId: opdScope,
    activeOnly,
    limit,
    offset
  });

  res.json({
    success: true,
    messages: result.rows,
    total: result.total,
    limit,
    offset
  });
};

exports.createBroadcastMessage = async (req, res) => {
  const { opd_id, device_sn, message, duration_minutes, start_time } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Konten teks pengumuman (message) wajib diisi'
    });
  }

  const sanitizedMsg = String(message).replace(/[\t\r\n]+/g, ' ').trim();
  if (sanitizedMsg.length > 320) {
    return res.status(400).json({
      success: false,
      message: 'Panjang pesan pengumuman maksimal 320 karakter'
    });
  }

  const durationMinutes = Math.max(parseInt(duration_minutes, 10) || 0, 0);
  const isSystemAdmin = req.user.role === 'admin';

  if (!isSystemAdmin && !req.user.opd_id) {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda tidak terikat dengan unit kerja (OPD) mana pun'
    });
  }

  const effectiveOpdScope = await resolveScopedOpdIds(req.user, opd_id);
  if (Array.isArray(effectiveOpdScope) && effectiveOpdScope.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Unit kerja (OPD) target berada di luar wewenang Anda'
    });
  }

  const targetSn = device_sn ? String(device_sn).trim() : null;

  if (targetSn) {
    const dev = await queries.getDeviceInfo(targetSn);
    if (!dev) {
      return res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${targetSn}`
      });
    }
    if (!isSystemAdmin && !canAccessOpd(req.user, dev.opd_id)) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat target berada di luar unit kerja (OPD) Anda'
      });
    }
  }

  const targetDevices = await queries.getTargetDevicesForBroadcast({
    opdId: effectiveOpdScope,
    deviceSn: targetSn
  });

  if (targetDevices.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tidak ada perangkat terverifikasi yang cocok dengan target pengiriman'
    });
  }

  let parsedStartTime = null;
  if (start_time) {
    const dt = new Date(start_time);
    if (!isNaN(dt.getTime())) {
      parsedStartTime = dt;
    }
  }

  const createdByUuid = req.user && req.user.id && /^[0-9a-fA-F-]{36}$/.test(String(req.user.id))
    ? req.user.id
    : null;

  const primaryOpdId = isSystemAdmin ? (opd_id || null) : (opd_id || req.user.opd_id);

  const broadcastRecord = await queries.createBroadcastMessage({
    opdId: primaryOpdId || (targetDevices.length === 1 ? targetDevices[0].opd_id : null),
    deviceSn: targetSn,
    message: sanitizedMsg,
    tag: 253,
    startTime: parsedStartTime,
    durationMinutes,
    createdBy: createdByUuid
  });

  const startDt = new Date(broadcastRecord.start_time || Date.now());
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(startDt);
  const partMap = {};
  for (const p of parts) partMap[p.type] = p.value;
  const hourStr = partMap.hour === '24' ? '00' : partMap.hour;
  const formattedStartTime = `${partMap.year}-${partMap.month}-${partMap.day} ${hourStr}:${partMap.minute}:${partMap.second}`;

  for (const dev of targetDevices) {
    await commandService.queueCommand(dev.sn, config.COMMAND_TYPES.DATA_SMS, {
      uid: broadcastRecord.id,
      message: sanitizedMsg,
      duration: durationMinutes,
      startTime: formattedStartTime,
      tag: 253
    });
  }

  logger.info('Public broadcast SMS queued for devices', {
    broadcast_id: broadcastRecord.id,
    target_count: targetDevices.length,
    opd_id: primaryOpdId,
    device_sn: targetSn,
    ip: req.ip
  });

  res.status(201).json({
    success: true,
    message: `Pengumuman berhasil diantrekan ke ${targetDevices.length} perangkat`,
    broadcast: {
      ...broadcastRecord,
      total_targets: targetDevices.length,
      pending_count: targetDevices.length,
      delivered_count: 0,
      success_count: 0,
      failed_count: 0
    },
    queued_devices: targetDevices.map(d => d.sn)
  });
};

exports.deleteBroadcastMessage = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID pengumuman tidak valid'
    });
  }

  const record = await queries.getBroadcastMessageById(id);
  if (!record) {
    return res.status(404).json({
      success: false,
      message: 'Pesan pengumuman tidak ditemukan'
    });
  }

  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const allowed = canAccessOpd(req.user, record.opd_id) || canAccessOpd(req.user, record.device_opd_id);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk menghapus pengumuman unit kerja lain'
      });
    }
  }

  await queries.deactivateBroadcastMessage(id);

  const targetDevices = await queries.getTargetDevicesForBroadcast({
    opdId: record.opd_id,
    deviceSn: record.device_sn
  });

  for (const dev of targetDevices) {
    await commandService.queueCommand(dev.sn, config.COMMAND_TYPES.DELETE_SMS, {
      uid: record.id
    });
  }

  logger.info('Public broadcast SMS deactivated and DELETE_SMS queued', {
    broadcast_id: id,
    target_count: targetDevices.length,
    ip: req.ip
  });

  res.json({
    success: true,
    message: `Perintah penghapusan pesan (UID=${id}) berhasil diantrekan ke ${targetDevices.length} perangkat`,
    queued_devices: targetDevices.map(d => d.sn)
  });
};
