'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const validateDevice = require('../middleware/deviceCheck');
const asyncHandler = require('../middleware/asyncHandler');
const adminController = require('../controllers/adminController');

router.use(apiKeyAuth);

// Device Reupload
router.post(config.PATHS.ADMIN.REUPLOAD, validateDevice, asyncHandler(adminController.reuploadDevice));
router.get('/admin/reupload/queue', asyncHandler(adminController.getReuploadQueue));

// Device Verification
router.post('/admin/verify/:sn', validateDevice, asyncHandler(adminController.verifyDevice));
router.delete('/admin/verify/:sn', validateDevice, asyncHandler(adminController.unverifyDevice));

// Device Management
router.get('/admin/devices', asyncHandler(adminController.listDevices));

// Device Commands
router.post(config.PATHS.ADMIN.CLEAR_LOG, validateDevice, asyncHandler(adminController.clearLog));
router.post(config.PATHS.ADMIN.INFO, validateDevice, asyncHandler(adminController.info));
router.post(config.PATHS.ADMIN.REBOOT, validateDevice, asyncHandler(adminController.reboot));

// User Management Commands
router.post(config.PATHS.ADMIN.USER, validateDevice, asyncHandler(adminController.updateUser));
router.delete(config.PATHS.ADMIN.USER_DELETE, validateDevice, asyncHandler(adminController.deleteUser));

// Fingerprint Management Commands
router.post(config.PATHS.ADMIN.ENROLL_FP, validateDevice, asyncHandler(adminController.enrollFingerprint));

// Command Queue Status
router.get(config.PATHS.ADMIN.COMMAND_QUEUE, asyncHandler(adminController.getCommandQueue));

// Data Retrieval Routes
router.get('/admin/pegawai/:pin', asyncHandler(adminController.getPegawai));
router.get('/admin/devices/:sn/pegawai', validateDevice, asyncHandler(adminController.getPegawaiByDevice));
router.get('/admin/fingerprint-check', asyncHandler(adminController.checkFingerprintOnDevice));

// Fingerprint Transfer
router.post(config.PATHS.ADMIN.TRANSFER_FP, validateDevice, asyncHandler(adminController.transferFingerprint));

module.exports = router;
