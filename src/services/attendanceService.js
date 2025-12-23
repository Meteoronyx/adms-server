'use strict';

const queries = require('../db/queries');
const config = require('../config');

// Attendance service functions
const insertAttendanceLogs = async (sn, logs) => {
  return queries.insertAttendanceLogs(sn, logs);
};

const handleAttendanceData = async (sn, rawBody) => {
  const verified = await queries.getDeviceVerificationStatus(sn);
  if (!verified) {
    throw new Error(config.RESPONSE.ERROR.DEVICE_NOT_VERIFIED);
  }
  
  // Note: Parsing will be done in controller
  return { verified: true };
};

const getTimeResponse = async (sn) => {
  const verified = await queries.getDeviceVerificationStatus(sn);
  const now = new Date();
  
  if (!verified) {
    // Offset hours from config for unverified devices
    const offsetHours = config.TIME.UNVERIFIED_OFFSET_HOURS;
    const offsetMs = offsetHours * 60 * 60 * 1000;
    const offsetTime = new Date(now.getTime() - offsetMs);
    const timeStr = offsetTime.toISOString().slice(0, 19);
    return `Time=${timeStr}`;
  }
  
  const timeStr = now.toISOString().slice(0, 19);
  return `Time=${timeStr}`;
};

const getHandshakeResponse = async (sn) => {
  const verified = await queries.getDeviceVerificationStatus(sn);
  const timezone = verified ? config.DEVICE.DEFAULT_TIMEZONE : config.TIME.UNVERIFIED_TIMEZONE;
  
  return `GET OPTION FROM: ${sn}
Stamp=9999
OpStamp=9999
PhotoStamp=9999
ErrorDelay=60
Delay=30
TransTimes=00:00
TransInterval=1
TransFlag=1011000000
Realtime=1
Encrypt=0
TimeZone=${timezone}
ServerVer=3.4.1 2018-06-30
ATTLOGStamp=0`;
};

module.exports = {
  insertAttendanceLogs,
  handleAttendanceData,
  getTimeResponse,
  getHandshakeResponse,
};
