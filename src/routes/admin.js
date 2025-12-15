'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const reuploadService = require('../services/reuploadService');
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

module.exports = router;
