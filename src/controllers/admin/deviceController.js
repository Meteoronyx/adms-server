'use strict';

const config = require('../../config');
const reuploadService = require('../../services/reuploadService');
const queries = require('../../db/queries');
const logger = require('../../utils/logger');
const { canAccessOpd, resolveScopedOpdIds } = require('../../middleware/apiKeyAuth');

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

  // Multi-tenant OPD scoping: non-admin melihat antrian reupload perangkat OPD-nya & Sub-OPD di bawahnya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin && !req.user.opd_id) {
    return res.json({ success: true, queue: {} });
  }
  if (!isSystemAdmin && req.user.opd_id) {
    const sns = Object.keys(queue);
    const scopedQueue = {};
    for (const sn of sns) {
      const device = await queries.getDeviceInfo(sn);
      if (device && canAccessOpd(req.user, device.opd_id)) {
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

  // Validasi: pastikan device_name dan opd_id sudah diisi sebelum verifikasi
  if (!device.device_name || !device.device_name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama perangkat wajib diisi terlebih dahulu sebelum melakukan verifikasi'
    });
  }

  if (!device.opd_id) {
    return res.status(400).json({
      success: false,
      message: 'Unit Kerja (OPD) wajib dipilih terlebih dahulu sebelum melakukan verifikasi'
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
  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  // Multi-tenant OPD scoping: jika daftar akses kosong, kembalikan array kosong
  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({
      success: true,
      devices: [],
      offlineDevices: []
    });
  }

  const devices = await queries.getAllDevices(opdScope);
  const offlineDevices = await queries.getOfflineDevices(opdScope);

  res.json({
    success: true,
    devices,
    offlineDevices
  });
};

exports.updateDeviceName = async (req, res) => {
  const { sn } = req.params;
  const { device_name, opd_id } = req.body;

  // Check device exists
  const device = await queries.getDeviceInfo(sn);
  if (!device) {
    return res.status(404).json({
      success: false,
      message: `Device not found: ${sn}`
    });
  }

  // Multi-tenant OPD scoping: non-admin hanya boleh mengubah perangkat milik OPD-nya / Sub-OPD-nya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const owned = canAccessOpd(req.user, device.opd_id);
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat tidak berada di unit kerja (OPD) Anda'
      });
    }
  }

  const updatePayload = {};
  if (device_name !== undefined) {
    updatePayload.deviceName = device_name.trim();
  }
  if (opd_id !== undefined && isSystemAdmin) {
    updatePayload.opdId = opd_id || null;
  }

  if (Object.keys(updatePayload).length > 0) {
    await queries.updateDeviceDetails(sn, updatePayload);
  }

  const updatedDevice = await queries.getDeviceInfo(sn);
  logger.info('Device details updated via API', { sn, device_name, opd_id, ip: req.ip });

  res.json({
    success: true,
    message: `Device ${sn} details updated`,
    device: updatedDevice
  });
};
