'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { requirePermission } = require('../middleware/requireRole');
const validateDevice = require('../middleware/deviceCheck');
const asyncHandler = require('../middleware/asyncHandler');
const deviceController = require('../controllers/admin/deviceController');
const commandController = require('../controllers/admin/commandController');
const biometricController = require('../controllers/admin/biometricController');
const pegawaiController = require('../controllers/admin/pegawaiController');
const attendanceController = require('../controllers/admin/attendanceController');
const broadcastController = require('../controllers/admin/broadcastController');
const dashboardController = require('../controllers/admin/dashboardController');
const opdController = require('../controllers/opdController');

router.use('/admin', apiKeyAuth);

// OPD Management Routes
router.get('/admin/opds', requirePermission('opds:read'), asyncHandler(opdController.listOpds));
router.get('/admin/opds/:id', requirePermission('opds:read'), asyncHandler(opdController.getOpd));
router.post('/admin/opds/auto-map', requirePermission('opds:write'), asyncHandler(opdController.triggerAutoMap));
router.post('/admin/opds', requirePermission('opds:write'), asyncHandler(opdController.createOpd));
router.put('/admin/opds/:id', requirePermission('opds:write'), asyncHandler(opdController.updateOpd));
router.delete('/admin/opds/:id', requirePermission('opds:delete'), asyncHandler(opdController.deleteOpd));

// Device Reupload & Commands Queue
router.post(config.PATHS.ADMIN.REUPLOAD, requirePermission('devices:command'), validateDevice, asyncHandler(deviceController.reuploadDevice));
router.get('/admin/reupload/queue', requirePermission('devices:command'), asyncHandler(deviceController.getReuploadQueue));
router.get(config.PATHS.ADMIN.COMMAND_QUEUE, requirePermission('devices:command'), asyncHandler(commandController.getCommandQueue));
router.get('/admin/commands/count', requirePermission('devices:command'), asyncHandler(commandController.getPendingCommandsCount));

// Device Verification
router.post('/admin/verify/:sn', requirePermission('devices:write'), validateDevice, asyncHandler(deviceController.verifyDevice));
router.delete('/admin/verify/:sn', requirePermission('devices:write'), validateDevice, asyncHandler(deviceController.unverifyDevice));

// Device Management
router.get('/admin/devices', requirePermission('devices:read'), asyncHandler(deviceController.listDevices));
router.patch('/admin/devices/:sn', requirePermission('devices:write'), asyncHandler(deviceController.updateDeviceName));

// Device Direct Commands
router.post(config.PATHS.ADMIN.CLEAR_LOG, requirePermission('devices:command'), validateDevice, asyncHandler(commandController.clearLog));
router.post(config.PATHS.ADMIN.INFO, requirePermission('devices:command'), validateDevice, asyncHandler(commandController.info));
router.post(config.PATHS.ADMIN.REBOOT, requirePermission('devices:command'), validateDevice, asyncHandler(commandController.reboot));

// Pegawai / Device User Management Commands
router.post(config.PATHS.ADMIN.USER, requirePermission('devices:write'), validateDevice, asyncHandler(commandController.updateUser));
router.delete(config.PATHS.ADMIN.USER_DELETE, requirePermission('devices:write'), validateDevice, asyncHandler(commandController.deleteUser));

// Biometrics Management Commands (Fingerprint & Face)
router.post(config.PATHS.ADMIN.ENROLL_FP, requirePermission('fingerprint:manage'), validateDevice, asyncHandler(biometricController.enrollFingerprint));
router.get('/admin/fingerprint-check', requirePermission('fingerprint:manage'), asyncHandler(biometricController.checkFingerprintOnDevice));
router.post(config.PATHS.ADMIN.TRANSFER_FP, requirePermission('fingerprint:manage'), validateDevice, asyncHandler(biometricController.transferFingerprint));
router.get('/admin/face-check', requirePermission('fingerprint:manage'), asyncHandler(biometricController.checkFaceOnDevice));
router.post(config.PATHS.ADMIN.TRANSFER_FACE, requirePermission('fingerprint:manage'), validateDevice, asyncHandler(biometricController.transferFace));
router.post(config.PATHS.ADMIN.TRANSFER_ALL, requirePermission('fingerprint:manage'), validateDevice, asyncHandler(biometricController.transferAllBiometrics));

// Data Retrieval Routes (Pegawai)
router.get('/admin/pegawai', requirePermission('devices:read'), asyncHandler(pegawaiController.listPegawai));
router.get('/admin/pegawai/search', requirePermission('devices:read'), asyncHandler(pegawaiController.searchPegawai));
router.get('/admin/pegawai/:pin', requirePermission('devices:read'), asyncHandler(pegawaiController.getPegawai));
router.get('/admin/devices/:sn/pegawai', requirePermission('devices:read'), validateDevice, asyncHandler(pegawaiController.getPegawaiByDevice));

// Attendance Logs, Photos & Export
router.get('/admin/attendance', requirePermission('attendance:read'), asyncHandler(attendanceController.getAttendanceLogs));
router.get('/admin/attendance/export/pdf', requirePermission('attendance:export'), asyncHandler(attendanceController.exportAttendancePdf));
router.get('/admin/attendance-photos/recent', requirePermission('attendance:read'), asyncHandler(attendanceController.getRecentAttendancePhotos));
router.get('/admin/attendance-photos/:id', requirePermission('attendance:read'), asyncHandler(attendanceController.getAttendancePhotoFile));

// Broadcast Messages (Public SMS / Running Text)
router.get('/admin/broadcast-messages', requirePermission('devices:command'), asyncHandler(broadcastController.listBroadcastMessages));
router.post('/admin/broadcast-messages', requirePermission('devices:command'), asyncHandler(broadcastController.createBroadcastMessage));
router.delete('/admin/broadcast-messages/:id', requirePermission('devices:command'), asyncHandler(broadcastController.deleteBroadcastMessage));

// Dashboard Stats
router.get('/admin/stats', requirePermission('devices:read'), asyncHandler(dashboardController.getDashboardStats));

module.exports = router;
