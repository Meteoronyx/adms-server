'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const reuploadService = require('../services/reuploadService');
const commandService = require('../services/commandService');
const queries = require('../db/queries');
const logger = require('../utils/logger');

router.use(apiKeyAuth);
router.post(config.PATHS.ADMIN.REUPLOAD, async (req, res) => {
  const { sn } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

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
  } catch (err) {
    logger.error('Admin reupload error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

router.get('/admin/reupload/queue', async (req, res) => {
  try {
    const queue = reuploadService.getQueueStatus();
    res.json({
      success: true,
      queue
    });
  } catch (err) {
    logger.error('Admin queue status error', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// POST /admin/verify/:sn - Verify a device
router.post('/admin/verify/:sn', async (req, res) => {
  const { sn } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

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
  } catch (err) {
    logger.error('Admin verify device error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// DELETE /admin/verify/:sn - Unverify a device
router.delete('/admin/verify/:sn', async (req, res) => {
  const { sn } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

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
  } catch (err) {
    logger.error('Admin unverify device error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// GET /admin/devices - List all devices
router.get('/admin/devices', async (req, res) => {
  try {
    const devices = await queries.getAllDevices();
    res.json({
      success: true,
      devices
    });
  } catch (err) {
    logger.error('Admin list devices error', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// POST /admin/clearlog/:sn - Queue CLEAR LOG command
router.post(config.PATHS.ADMIN.CLEAR_LOG, async (req, res) => {
  const { sn } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

    await commandService.queueCommand(sn, config.COMMAND_TYPES.CLEAR_LOG);
    logger.info('Clear log command queued', { sn, ip: req.ip });

    res.json({
      success: true,
      message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: CLEAR LOG`,
      device: { sn: device.sn, name: device.name }
    });
  } catch (err) {
    logger.error('Admin clear log error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// POST /admin/info/:sn - Queue INFO command
router.post(config.PATHS.ADMIN.INFO, async (req, res) => {
  const { sn } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

    await commandService.queueCommand(sn, config.COMMAND_TYPES.INFO);
    logger.info('Info command queued', { sn, ip: req.ip });

    res.json({
      success: true,
      message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: INFO`,
      device: { sn: device.sn, name: device.name }
    });
  } catch (err) {
    logger.error('Admin info error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// POST /admin/reboot/:sn - Queue REBOOT command
router.post(config.PATHS.ADMIN.REBOOT, async (req, res) => {
  const { sn } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

    await commandService.queueCommand(sn, config.COMMAND_TYPES.REBOOT);
    logger.info('Reboot command queued', { sn, ip: req.ip });

    res.json({
      success: true,
      message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: REBOOT`,
      device: { sn: device.sn, name: device.name }
    });
  } catch (err) {
    logger.error('Admin reboot error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// POST /admin/user/:sn - Queue UPDATE USER command (for privilege change)
router.post(config.PATHS.ADMIN.USER, async (req, res) => {
  const { sn } = req.params;
  const { pin, privilege, passwd } = req.body;

  if (pin === undefined || pin === null) {
    res.status(400).json({
      success: false,
      message: config.RESPONSE.ADMIN.MISSING_PIN
    });
    return;
  }

  if (privilege === undefined || privilege === null) {
    res.status(400).json({
      success: false,
      message: config.RESPONSE.ADMIN.MISSING_PRIVILEGE
    });
    return;
  }

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

    await commandService.queueCommand(sn, config.COMMAND_TYPES.UPDATE_USER, {
      pin: parseInt(pin),
      privilege: parseInt(privilege),
      passwd: passwd !== undefined ? parseInt(passwd) : 0
    });
    logger.info('Update user command queued', { sn, pin, privilege, passwd, ip: req.ip });

    res.json({
      success: true,
      message: `${config.RESPONSE.ADMIN.COMMAND_QUEUED}: UPDATE USER`,
      device: { sn: device.sn, name: device.name },
      params: { pin, privilege, passwd: passwd !== undefined ? parseInt(passwd) : 0 }
    });
  } catch (err) {
    logger.error('Admin update user error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// DELETE /admin/user/:sn/:pin - Queue DELETE USER command (for delete user)
router.delete(config.PATHS.ADMIN.USER_DELETE, async (req, res) => {
  const { sn, pin } = req.params;

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

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
  } catch (err) {
    logger.error('Admin delete user error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// POST /admin/enrollfp/:sn - Queue ENROLL_FP command (for fingerprint enrollment)
router.post(config.PATHS.ADMIN.ENROLL_FP, async (req, res) => {
  const { sn } = req.params;
  const { pin, fid, retry, overwrite } = req.body;

  if (pin === undefined || pin === null) {
    res.status(400).json({
      success: false,
      message: 'Missing required parameter: pin'
    });
    return;
  }

  if (fid === undefined || fid === null) {
    res.status(400).json({
      success: false,
      message: 'Missing required parameter: fid'
    });
    return;
  }

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
      return;
    }

    await commandService.queueCommand(sn, config.COMMAND_TYPES.ENROLL_FP, {
      pin: parseInt(pin),
      fid: parseInt(fid),
      retry: retry !== undefined ? parseInt(retry) : 3,
      overwrite: overwrite !== undefined ? parseInt(overwrite) : 0
    });
    logger.info('Enroll fingerprint command queued', { 
      sn, 
      pin, 
      fid, 
      retry: retry !== undefined ? parseInt(retry) : 3,
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
        retry: retry !== undefined ? parseInt(retry) : 3,
        overwrite: overwrite !== undefined ? parseInt(overwrite) : 0
      }
    });
  } catch (err) {
    logger.error('Admin enroll fingerprint error', {
      message: err.message,
      stack: err.stack,
      sn
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

// GET /admin/commands/queue - Get all pending commands
router.get(config.PATHS.ADMIN.COMMAND_QUEUE, async (req, res) => {
  try {
    const commands = await commandService.getQueueStatus();
    res.json({
      success: true,
      commands
    });
  } catch (err) {
    logger.error('Admin command queue error', {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({
      success: false,
      message: config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;
