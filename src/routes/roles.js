'use strict';

const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { requirePermission } = require('../middleware/requireRole');
const asyncHandler = require('../middleware/asyncHandler');
const roleController = require('../controllers/roleController');

// Roles & Permissions Endpoints
router.get('/admin/roles', apiKeyAuth, requirePermission(['roles:read', 'users:read']), asyncHandler(roleController.listRoles));
router.get('/admin/permissions', apiKeyAuth, requirePermission(['roles:read', 'users:read']), asyncHandler(roleController.listPermissions));
router.post('/admin/roles', apiKeyAuth, requirePermission('roles:write'), asyncHandler(roleController.createRole));
router.put('/admin/roles/:id', apiKeyAuth, requirePermission('roles:write'), asyncHandler(roleController.updateRole));
router.delete('/admin/roles/:id', apiKeyAuth, requirePermission('roles:delete'), asyncHandler(roleController.deleteRole));

module.exports = router;
