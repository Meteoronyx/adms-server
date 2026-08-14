'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { requirePermission } = require('../middleware/requireRole');
const validateDevice = require('../middleware/deviceCheck');
const asyncHandler = require('../middleware/asyncHandler');
const adminController = require('../controllers/adminController');
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
router.post(config.PATHS.ADMIN.REUPLOAD, requirePermission('devices:command'), validateDevice, asyncHandler(adminController.reuploadDevice));
router.get('/admin/reupload/queue', requirePermission('devices:command'), asyncHandler(adminController.getReuploadQueue));
router.get(config.PATHS.ADMIN.COMMAND_QUEUE, requirePermission('devices:command'), asyncHandler(adminController.getCommandQueue));

// Device Verification
router.post('/admin/verify/:sn', requirePermission('devices:write'), validateDevice, asyncHandler(adminController.verifyDevice));
router.delete('/admin/verify/:sn', requirePermission('devices:write'), validateDevice, asyncHandler(adminController.unverifyDevice));

// Device Management
router.get('/admin/devices', requirePermission('devices:read'), asyncHandler(adminController.listDevices));
router.patch('/admin/devices/:sn', requirePermission('devices:write'), asyncHandler(adminController.updateDeviceName));

// Device Direct Commands
router.post(config.PATHS.ADMIN.CLEAR_LOG, requirePermission('devices:command'), validateDevice, asyncHandler(adminController.clearLog));
router.post(config.PATHS.ADMIN.INFO, requirePermission('devices:command'), validateDevice, asyncHandler(adminController.info));
router.post(config.PATHS.ADMIN.REBOOT, requirePermission('devices:command'), validateDevice, asyncHandler(adminController.reboot));

// Pegawai / Device User Management Commands
router.post(config.PATHS.ADMIN.USER, requirePermission('devices:write'), validateDevice, asyncHandler(adminController.updateUser));
router.delete(config.PATHS.ADMIN.USER_DELETE, requirePermission('devices:write'), validateDevice, asyncHandler(adminController.deleteUser));

// Fingerprint Management Commands
router.post(config.PATHS.ADMIN.ENROLL_FP, requirePermission('fingerprint:manage'), validateDevice, asyncHandler(adminController.enrollFingerprint));
router.get('/admin/fingerprint-check', requirePermission('fingerprint:manage'), asyncHandler(adminController.checkFingerprintOnDevice));
router.post(config.PATHS.ADMIN.TRANSFER_FP, requirePermission('fingerprint:manage'), validateDevice, asyncHandler(adminController.transferFingerprint));

// Data Retrieval Routes (Pegawai)
router.get('/admin/pegawai/search', requirePermission('devices:read'), asyncHandler(adminController.searchPegawai));
router.get('/admin/pegawai/:pin', requirePermission('devices:read'), asyncHandler(adminController.getPegawai));
router.get('/admin/devices/:sn/pegawai', requirePermission('devices:read'), validateDevice, asyncHandler(adminController.getPegawaiByDevice));

// Attendance Logs
router.get('/admin/attendance', requirePermission('attendance:read'), asyncHandler(adminController.getAttendanceLogs));

// Dashboard Stats
router.get('/admin/stats', requirePermission('devices:read'), asyncHandler(adminController.getDashboardStats));

module.exports = router;
