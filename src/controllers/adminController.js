'use strict';

const config = require('../config');
const reuploadService = require('../services/reuploadService');
const commandService = require('../services/commandService');
const userService = require('../services/userService');
const queries = require('../db/queries');
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
  res.json({
    success: true,
    queue
  });
};

// Device Verification
exports.verifyDevice = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  await queries.verifyDevice(sn);
  logger.info('Device verified via API', { sn, ip: req.ip });

  res.json({
    success: true,
    message: `Device ${sn} has been verified`,
    device: {
      sn: device.sn,
      name: device.name,
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
  const devices = await queries.getAllDevices();
  res.json({
    success: true,
    devices
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
  const { pin, privilege, passwd } = req.body;
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

  await commandService.queueCommand(sn, config.COMMAND_TYPES.DATA_USER, params);
  logger.info('Update user command queued', { sn, pin, privilege, passwd, ip: req.ip });

  res.json({
    success: true,
    message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: UPDATE USER`,
    device: { sn: device.sn, name: device.name },
    params: { pin, privilege, ...(passwd !== undefined && passwd !== null && passwd !== '' ? { passwd: parseInt(passwd) } : {}) }
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
  const commands = await commandService.getQueueStatus();
  res.json({
    success: true,
    commands
  });
};

// Data Retrieval Routes (getpegawai)
exports.getPegawai = async (req, res) => {
  const { pin } = req.params;
  const pegawai = await userService.getPegawaiWithFingerprints(pin);

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

// Data Retrieval Routes (getpegawaibydevice)
exports.getPegawaiByDevice = async (req, res) => {
  const { sn } = req.params;
  const device = req.device;

  const pegawai = await userService.getPegawaiByDevice(sn);
  res.json({
    success: true,
    device: {
      sn: device.sn,
      name: device.name,
      device_name: device.device_name
    },
    count: pegawai.length,
    pegawai
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
