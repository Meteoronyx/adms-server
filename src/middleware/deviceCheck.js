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

    req.device = device;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validateDevice;
