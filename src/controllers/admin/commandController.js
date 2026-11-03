'use strict';

const config = require('../../config');
const commandService = require('../../services/commandService');
const queries = require('../../db/queries');
const logger = require('../../utils/logger');
const { resolveScopedOpdIds } = require('../../middleware/apiKeyAuth');

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

// Device Commands (getcommandqueue)
exports.getCommandQueue = async (req, res) => {
  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    if (req.query.count_only === 'true' || req.query.count === 'true') {
      return res.json({ success: true, count: 0 });
    }
    return res.json({ success: true, commands: [], data: [], total: 0, count: 0, limit: 25, offset: 0 });
  }

  if (req.query.count_only === 'true' || req.query.count === 'true') {
    const count = await commandService.getQueueCount(opdScope);
    return res.json({ success: true, count });
  }

  const isAll = req.query.all === 'true';
  const limit = isAll
    ? null
    : Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const offset = isAll ? 0 : Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const status = req.query.status !== undefined ? req.query.status.trim() : 'pending';
  const search = req.query.search ? req.query.search.trim() : null;
  const commandType = req.query.command_type ? req.query.command_type.trim() : null;

  const result = await commandService.getQueueStatus(opdScope, {
    limit,
    offset,
    status,
    search,
    commandType,
    all: isAll
  });

  const rows = Array.isArray(result) ? result : (result.rows || []);
  const total = result.total !== undefined ? result.total : rows.length;

  res.json({
    success: true,
    commands: rows,
    data: rows,
    total,
    count: rows.length,
    limit: limit || rows.length,
    offset
  });
};

exports.getPendingCommandsCount = async (req, res) => {
  const opdScope = await resolveScopedOpdIds(req.user, req.query.opd_id);

  if (Array.isArray(opdScope) && opdScope.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  const count = await commandService.getQueueCount(opdScope);
  res.json({
    success: true,
    count
  });
};
