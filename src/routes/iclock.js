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
const userService = require('../services/userService');
const photoService = require('../services/photoService');
const queries = require('../db/queries');
const logger = require('../utils/logger');

// Broadcast event hanya ke admin (room opd:all) dan room OPD pemilik perangkat
async function broadcastDeviceEvent(app, sn, event, payload) {
  const io = app.get('io');
  if (!io) return;
  const opdId = await queries.getDeviceOpdId(sn);
  if (opdId) {
    io.to('opd:all').to(`opd:${opdId}`).emit(event, payload);
  } else {
    io.to('opd:all').emit(event, payload);
  }
}

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

  // Handle OPERLOG / BIODATA / FACE (User & Biometric data)
  if (table === config.TABLES.OPERLOG || table === 'BIODATA' || table === 'FACE') {
    try {
      const verified = await deviceService.getDeviceVerificationStatus(SN);
      if (!verified) {
        logger.warn('Unverified device attempted to send OPERLOG', {
          sn: SN,
          ip: ip,
          action: 'blocked'
        });
        res.set('Content-Type', 'text/plain');
        res.send(config.RESPONSE.ERROR.DEVICE_NOT_VERIFIED);
        return;
      }

      await userService.handleOperlog(SN, req.rawBody);
      res.set('Content-Type', 'text/plain');
      res.send(config.RESPONSE.OK);
    } catch (err) {
      logger.error('iclock/cdata POST OPERLOG error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        ip: req.ip,
        sn: SN
      });
      res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
    }
    return;
  }

  // Handle ATTPHOTO via POST /iclock/cdata?table=ATTPHOTO (Base64 payload)
  if (table === config.TABLES.ATTPHOTO) {
    try {
      const verified = await deviceService.getDeviceVerificationStatus(SN);
      if (!verified) {
        logger.warn('Unverified device attempted to send ATTPHOTO', {
          sn: SN,
          ip: ip,
          action: 'blocked'
        });
        res.set('Content-Type', 'text/plain');
        res.send(config.RESPONSE.ERROR.DEVICE_NOT_VERIFIED);
        return;
      }

      const photos = parsers.parseAttendancePhotoBase64(req.rawBody);
      for (const p of photos) {
        const targetSn = p.sn || SN;
        const photoRecord = await photoService.saveAttendancePhoto({
          sn: targetSn,
          pin: p.pin,
          photoTime: p.photoTime,
          buffer: p.jpegBuffer,
          size: p.size
        });

        await broadcastDeviceEvent(req.app, targetSn, 'attendance_photo', {
          id: photoRecord.id,
          sn: targetSn,
          device_name: photoRecord.device_name || targetSn,
          nama_opd: photoRecord.nama_opd || null,
          pin: p.pin,
          pegawai_name: photoRecord.pegawai_name || null,
          photo_time: photoRecord.photo_time,
          file_size: photoRecord.file_size,
          photo_url: `/admin/attendance-photos/${photoRecord.id}`
        });
      }

      res.set('Content-Type', 'text/plain');
      res.send(config.RESPONSE.OK);
    } catch (err) {
      logger.error('iclock/cdata POST ATTPHOTO error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        ip: req.ip,
        sn: SN
      });
      res.set('Content-Type', 'text/plain');
      res.send(config.RESPONSE.OK);
    }
    return;
  }

  // Ignore other non-ATTLOG tables
  if (table !== config.TABLES.ATTLOG) {
    logger.debug('Ignoring non-ATTLOG/OPERLOG table', { sn: SN, table: table, ip: ip });
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
    
    // Broadcast attendance update (OPD-scoped)
    await broadcastDeviceEvent(req.app, SN, 'attendance_update', { sn: SN, logCount: logs.length });

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
    
    // Broadcast device status update (OPD-scoped)
    await broadcastDeviceEvent(req.app, SN, 'device_update', { sn: SN });

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
    const commandResults = parsers.parseCommandResults(req.rawBody);
    if (commandResults && commandResults.length > 0) {
      await deviceService.handleDeviceCommandResults(SN, ip, commandResults);
    } else {
      const deviceInfo = parsers.parseDeviceInfo(req.rawBody);
      await deviceService.handleDeviceCommand(SN, ip, deviceInfo);
    }
    
    // Broadcast device update via Socket.io to trigger frontend real-time updates (OPD-scoped)
    await broadcastDeviceEvent(req.app, SN, 'device_update', { sn: SN });
    
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

// POST /iclock/fdata - Ingestion foto absensi pegawai (Binary JPEG stream)
router.post('/iclock/fdata', rawBodyParser.rawBufferParser, async (req, res) => {
  const { SN } = req.query;
  const ip = req.ip || 'unknown';

  try {
    const parsed = parsers.parseAttendancePhotoStream(req.rawBuffer);
    if (!parsed || !parsed.jpegBuffer) {
      logger.debug('Received non-photo or invalid stream on /iclock/fdata', { sn: SN, ip });
      res.set('Content-Type', 'text/plain');
      return res.send(config.RESPONSE.OK);
    }

    const targetSn = parsed.sn || SN;
    if (!targetSn) {
      res.set('Content-Type', 'text/plain');
      return res.send(config.RESPONSE.OK);
    }

    const verified = await deviceService.getDeviceVerificationStatus(targetSn);
    if (!verified) {
      logger.warn('Unverified device attempted to upload photo via /iclock/fdata', {
        sn: targetSn,
        ip,
        action: 'blocked'
      });
      res.set('Content-Type', 'text/plain');
      return res.send(config.RESPONSE.OK);
    }

    const photoRecord = await photoService.saveAttendancePhoto({
      sn: targetSn,
      pin: parsed.pin,
      photoTime: parsed.photoTime,
      buffer: parsed.jpegBuffer,
      size: parsed.size
    });

    await broadcastDeviceEvent(req.app, targetSn, 'attendance_photo', {
      id: photoRecord.id,
      sn: targetSn,
      device_name: photoRecord.device_name || targetSn,
      nama_opd: photoRecord.nama_opd || null,
      pin: parsed.pin,
      pegawai_name: photoRecord.pegawai_name || null,
      photo_time: photoRecord.photo_time,
      file_size: photoRecord.file_size,
      photo_url: `/admin/attendance-photos/${photoRecord.id}`
    });

    res.set('Content-Type', 'text/plain');
    res.send(config.RESPONSE.OK);
  } catch (err) {
    logger.error('Error processing /iclock/fdata photo upload', {
      sn: SN,
      ip,
      message: err.message,
      stack: err.stack
    });
    // Tetap kirim OK agar mesin tidak re-upload terus menerus saat terjadi kendala internal
    res.set('Content-Type', 'text/plain');
    res.send(config.RESPONSE.OK);
  }
});

module.exports = router;
