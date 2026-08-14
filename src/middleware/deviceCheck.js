'use strict';

const queries = require('../db/queries');
const config = require('../config');

const validateDevice = async (req, res, next) => {
  const { sn } = req.params;

  if (!sn) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameter: sn'
    });
  }

  try {
    const device = await queries.getDeviceInfo(sn);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: `${config.RESPONSE.ADMIN.DEVICE_NOT_FOUND}: ${sn}`
      });
    }

    // Multi-tenant OPD scoping: non-admin hanya boleh mengakses perangkat milik OPD-nya
    const isSystemAdmin = req.user && req.user.role === 'admin';
    if (!isSystemAdmin) {
      const owned = !!req.user.opd_id && device.opd_id === req.user.opd_id;
      if (!owned) {
        return res.status(403).json({
          success: false,
          message: 'Perangkat tidak berada di unit kerja (OPD) Anda'
        });
      }
    }

    req.device = device;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validateDevice;
