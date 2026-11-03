'use strict';

const config = require('../../config');
const commandService = require('../../services/commandService');
const userService = require('../../services/userService');
const queries = require('../../db/queries');
const logger = require('../../utils/logger');
const { canAccessOpd } = require('../../middleware/apiKeyAuth');

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

// Data Retrieval Routes (checkfingerprintondevice)
exports.checkFingerprintOnDevice = async (req, res) => {
  const pin = req.query.pin;
  const sn = req.query.sn || req.query.source_sn;

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

  // Multi-tenant OPD scoping: non-admin boleh memeriksa perangkat OPD-nya atau Sub-OPD-nya
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

// Data Retrieval Routes (checkfaceondevice)
exports.checkFaceOnDevice = async (req, res) => {
  const pin = req.query.pin;
  const sn = req.query.sn || req.query.source_sn;

  if (!pin || !sn) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: pin and sn'
    });
  }

  const device = await queries.getDeviceInfo(sn);
  if (!device) {
    return res.status(404).json({
      success: false,
      message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
    });
  }

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

  const faces = await userService.checkFaceOnDevice(pin, sn);

  if (faces.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No face templates found for pegawai ${pin} at device ${sn}`
    });
  }

  res.json({
    success: true,
    pegawai_pin: pin,
    device: sn,
    count: faces.length,
    faces
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

  // Multi-tenant OPD scoping: non-admin boleh transfer dari perangkat OPD-nya / Sub-OPD-nya
  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const sourceDevice = await queries.getDeviceInfo(source_sn);
    if (!sourceDevice) {
      return res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${source_sn}`
      });
    }
    const owned = canAccessOpd(req.user, sourceDevice.opd_id);
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

// Device Commands (transferface)
exports.transferFace = async (req, res) => {
  const { sn } = req.params; // Target device SN
  const { pin, source_sn } = req.body;
  const targetDevice = req.device;

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

  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const sourceDevice = await queries.getDeviceInfo(source_sn);
    if (!sourceDevice) {
      return res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${source_sn}`
      });
    }
    const owned = canAccessOpd(req.user, sourceDevice.opd_id);
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat sumber tidak berada di unit kerja (OPD) Anda'
      });
    }
  }

  const faces = await userService.checkFaceOnDevice(pin, source_sn);
  if (faces.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No face templates found for pegawai ${pin} at source device ${source_sn}`
    });
  }

  const pegawaiInfo = await queries.getPegawaiBasicInfo(pin, source_sn);
  if (!pegawaiInfo) {
    return res.status(404).json({
      success: false,
      message: `Pegawai not found: ${pin}`
    });
  }

  // 1. Queue DATA USER first
  await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_USER, {
    pin: pin,
    name: pegawaiInfo.name,
    privilege: pegawaiInfo.privilege || 0,
    passwd: pegawaiInfo.password || null
  });

  // 2. Queue DATA UPDATE FACE commands
  const queuedFaces = [];
  for (const f of faces) {
    await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_FACE, {
      pin: pin,
      face_id: f.face_id,
      size: f.size || 1214,
      valid: f.valid || 1,
      template: f.template
    });
    queuedFaces.push(f.face_id);
  }

  logger.info('Face transfer commands queued', {
    target_sn: sn,
    source_sn: source_sn,
    pin: pin,
    face_count: queuedFaces.length,
    ip: req.ip
  });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: DATA_FACE (${queuedFaces.length} face segments)`,
    target_device: { sn: targetDevice.sn, name: targetDevice.name },
    source_device: source_sn,
    pegawai_pin: pin,
    faces_queued: queuedFaces.length,
    face_ids: queuedFaces
  });
};

// Device Commands (transferall: user + fingerprints + faces)
exports.transferAllBiometrics = async (req, res) => {
  const { sn } = req.params; // Target device SN
  const { pin, source_sn } = req.body;
  const targetDevice = req.device;

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

  const isSystemAdmin = req.user.role === 'admin';
  if (!isSystemAdmin) {
    const sourceDevice = await queries.getDeviceInfo(source_sn);
    if (!sourceDevice) {
      return res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${source_sn}`
      });
    }
    const owned = canAccessOpd(req.user, sourceDevice.opd_id);
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: 'Perangkat sumber tidak berada di unit kerja (OPD) Anda'
      });
    }
  }

  const pegawaiInfo = await queries.getPegawaiBasicInfo(pin, source_sn);
  if (!pegawaiInfo) {
    return res.status(404).json({
      success: false,
      message: `Pegawai not found: ${pin}`
    });
  }

  const fingerprints = await userService.checkFingerprintOnDevice(pin, source_sn);
  const faces = await userService.checkFaceOnDevice(pin, source_sn);

  if (fingerprints.length === 0 && faces.length === 0) {
    return res.status(404).json({
      success: false,
      message: `No fingerprints or faces found for pegawai ${pin} at source device ${source_sn}`
    });
  }

  // 1. Queue DATA USER
  await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_USER, {
    pin: pin,
    name: pegawaiInfo.name,
    privilege: pegawaiInfo.privilege || 0,
    passwd: pegawaiInfo.password || null
  });

  // 2. Queue DATA_FP commands
  const queuedFps = [];
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
    queuedFps.push(fp.finger_id);
  }

  // 3. Queue DATA_FACE commands
  const queuedFaces = [];
  for (const f of faces) {
    await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_FACE, {
      pin: pin,
      face_id: f.face_id,
      size: f.size || 1214,
      valid: f.valid || 1,
      template: f.template
    });
    queuedFaces.push(f.face_id);
  }

  logger.info('Full biometrics transfer commands queued', {
    target_sn: sn,
    source_sn: source_sn,
    pin: pin,
    fingerprints_queued: queuedFps.length,
    faces_queued: queuedFaces.length,
    ip: req.ip
  });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: ALL_BIOMETRICS (1 user, ${queuedFps.length} fingerprints, ${queuedFaces.length} face segments)`,
    target_device: { sn: targetDevice.sn, name: targetDevice.name },
    source_device: source_sn,
    pegawai_pin: pin,
    fingerprints_queued: queuedFps.length,
    faces_queued: queuedFaces.length,
    total_commands: 1 + queuedFps.length + queuedFaces.length
  });
};
