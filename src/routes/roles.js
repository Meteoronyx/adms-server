'use strict';

const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { requirePermission } = require('../middleware/requireRole');
const asyncHandler = require('../middleware/asyncHandler');
const roleController = require('../controllers/roleController');

router.use('/admin', apiKeyAuth);

// Roles & Permissions Endpoints
router.get('/admin/roles', requirePermission(['roles:read', 'users:read']), asyncHandler(roleController.listRoles));
router.get('/admin/permissions', requirePermission(['roles:read', 'users:read']), asyncHandler(roleController.listPermissions));
router.post('/admin/roles', requirePermission('roles:write'), asyncHandler(roleController.createRole));
router.put('/admin/roles/:id', requirePermission('roles:write'), asyncHandler(roleController.updateRole));
router.delete('/admin/roles/:id', requirePermission('roles:delete'), asyncHandler(roleController.deleteRole));

module.exports = router;
