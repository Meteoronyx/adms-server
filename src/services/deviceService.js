'use strict';

const queries = require('../db/queries');
const config = require('../config');

// Device service functions
const upsertDevice = async (sn, ip, timezone = config.DEVICE.DEFAULT_TIMEZONE, status = config.DEVICE.DEFAULT_STATUS) => {
  return queries.upsertDevice(sn, ip, timezone, status);
};

const updateDeviceInfo = async (sn, info) => {
  return queries.updateDeviceInfo(sn, info);
};

const getDeviceVerificationStatus = async (sn) => {
  return queries.getDeviceVerificationStatus(sn);
};

const handleDeviceHeartbeat = async (sn, ip, infoParam) => {
  await upsertDevice(sn, ip);
  
  if (infoParam) {
    const decoded = decodeURIComponent(infoParam);
    const parts = decoded.split(',');
    const info = {};
    if (parts[0]) info.fwVersion = parts[0];
    if (parts[1]) info.userCount = parseInt(parts[1]);
    if (parts[2]) info.transactionCount = parseInt(parts[2]);
    if (parts[4]) info.ipAddress = parts[4];
    
    await updateDeviceInfo(sn, info);
  }
};

const handleDeviceCommand = async (sn, ip, deviceInfo) => {
  await upsertDevice(sn, ip);
  await updateDeviceInfo(sn, deviceInfo);
};

module.exports = {
  upsertDevice,
  updateDeviceInfo,
  getDeviceVerificationStatus,
  handleDeviceHeartbeat,
  handleDeviceCommand,
};
