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

module.exports = router;
