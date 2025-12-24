'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const rawBodyParser = require('../middleware/rawBodyParser');
const parsers = require('../utils/parsers');
const deviceService = require('../services/deviceService');
const attendanceService = require('../services/attendanceService');
const reuploadService = require('../services/reuploadService');
const commandService = require('../services/commandService');
const logger = require('../utils/logger');

// GET /iclock/cdata - Handshake & Time sync
router.get(config.PATHS.ICLOCK.CDATA, async (req, res) => {
  const { SN, type } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    logger.warn('Missing device serial number in request', {
      ip: ip,
      query: req.query
    });
    res.status(400).send(config.RESPONSE.ERROR.MISSING_SN);
    return;
  }

  try {
    await deviceService.upsertDevice(SN, ip);
    
    if (type === 'time') {
      const response = await attendanceService.getTimeResponse(SN);
      res.set('Content-Type', 'text/plain');
      res.send(response);
    } else {
      const response = await attendanceService.getHandshakeResponse(SN);
      logger.info('Device handshake completed', { sn: SN, ip: ip });
      res.set('Content-Type', 'text/plain');
      res.send(response);
    }
  } catch (err) {
    logger.error('iclock/cdata GET error', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      ip: req.ip,
      sn: SN
    });
    res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
  }
});

// POST /iclock/cdata - Attendance logs
router.post(config.PATHS.ICLOCK.CDATA, rawBodyParser, async (req, res) => {
  const { SN, table } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    logger.warn('Missing device serial number in POST request', {
      ip: ip,
      query: req.query
    });
    res.status(400).send(config.RESPONSE.ERROR.INVALID_REQUEST);
    return;
  }

  // Jika table bukan ATTLOG (misalnya OPERLOG), langsung return OK tanpa proses
  if (table !== config.TABLES.ATTLOG) {
    logger.debug('Ignoring non-ATTLOG table', { sn: SN, table: table, ip: ip });
    res.set('Content-Type', 'text/plain');
    res.send(config.RESPONSE.OK);
    return;
  }

  try {
    const verified = await deviceService.getDeviceVerificationStatus(SN);
    if (!verified) {
      logger.warn('Unverified device attempted to send data', {
        sn: SN,
        ip: ip,
        action: 'blocked'
      });
      res.set('Content-Type', 'text/plain');
      res.send(config.RESPONSE.ERROR.DEVICE_NOT_VERIFIED);
      return;
    }
    
    const logs = parsers.parseAttendanceLogs(req.rawBody);
    
    // Log when receiving attendance data
    logger.info('Receiving attendance logs from device', {
      sn: SN,
      ip: ip,
      log_count: logs.length
    });
    
    await attendanceService.insertAttendanceLogs(SN, logs);
    
    res.set('Content-Type', 'text/plain');
    res.send(config.RESPONSE.OK);
  } catch (err) {
    logger.error('iclock/cdata POST ATTLOG error', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      ip: req.ip,
      sn: SN
    });
    res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
  }
});

// GET /iclock/getrequest - Heartbeat
router.get(config.PATHS.ICLOCK.GETREQUEST, async (req, res) => {
  const { SN, INFO } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    res.status(400).send(config.RESPONSE.ERROR.MISSING_SN);
    return;
  }

  try {
    await deviceService.handleDeviceHeartbeat(SN, ip, INFO);
    
    // Step 1: Check if admin requested reupload
    const needsReupload = reuploadService.checkAndRemove(SN);
    if (needsReupload) {
      logger.info('Triggering reupload for device', { sn: SN });
      res.set('Content-Type', 'text/plain');
      res.send(config.COMMANDS.CHECK);
      return;
    }
    
    // Step 2: Check for pending commands in queue
    const pendingCommand = await commandService.getAndExecuteNext(SN);
    if (pendingCommand) {
      logger.info('Sending command to device', { 
        sn: SN, 
        type: pendingCommand.type,
        command: pendingCommand.commandString 
      });
      res.set('Content-Type', 'text/plain');
      res.send(pendingCommand.commandString);
      return;
    }
    
    // Step 3: Only send CHECK command on first connection (when initial_sync_completed is false)
    if (INFO) {
      const syncCompleted = await deviceService.getInitialSyncStatus(SN);
      
      if (!syncCompleted) {
        // First time sync - send CHECK command and mark as completed
        logger.info('Initial sync triggered for device', { sn: SN });
        await deviceService.markInitialSyncCompleted(SN);
        res.set('Content-Type', 'text/plain');
        res.send(config.COMMANDS.CHECK);
        return;
      }
    }
    
    // Normal response - just OK
    res.set('Content-Type', 'text/plain');
    res.send(config.RESPONSE.OK);
  } catch (err) {
    logger.error('iclock/getrequest heartbeat error', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      ip: req.ip,
      sn: SN
    });
    res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
  }
});

// POST /iclock/devicecmd - Device commands
router.post(config.PATHS.ICLOCK.DEVICECMD, rawBodyParser, async (req, res) => {
  const { SN } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    res.status(400).send(config.RESPONSE.ERROR.MISSING_SN);
    return;
  }

  try {
    const deviceInfo = parsers.parseDeviceInfo(req.rawBody);
    await deviceService.handleDeviceCommand(SN, ip, deviceInfo);
    
    res.set('Content-Type', 'text/plain');
    res.send(config.RESPONSE.OK);
  } catch (err) {
    logger.error('iclock/devicecmd error', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      ip: req.ip,
      sn: SN
    });
    res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
  }
});

module.exports = router;
