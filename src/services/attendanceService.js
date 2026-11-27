'use strict';

const queries = require('../db/queries');
const config = require('../config');

const DEFAULT_TRANS_FLAG = '110111111111';
const USERS_ONLY_TRANS_FLAG = '000111111111';

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

const getHandshakeResponse = async (sn, options = {}) => {
  const verified = await queries.getDeviceVerificationStatus(sn);
  const timezone = verified ? config.DEVICE.DEFAULT_TIMEZONE : config.TIME.UNVERIFIED_TIMEZONE;

  let attlogStamp = '0';
  let transFlag = DEFAULT_TRANS_FLAG;
  if (options.usersOnly === true) {
    const lastStamp = await queries.getDeviceAttlogStamp(sn);
    attlogStamp = lastStamp && Number(lastStamp) > 0
      ? String(lastStamp)
      : String(Math.floor(Date.now() / 1000));
    transFlag = USERS_ONLY_TRANS_FLAG;
  }

  return `GET OPTION FROM: ${sn}
Stamp=${attlogStamp}
OpStamp=0
PhotoStamp=0
ErrorDelay=10
Delay=30
TransTimes=00:00;03:00
TransInterval=1
TransFlag=${transFlag}
Realtime=1
Encrypt=0
TimeZone=${timezone}
ServerVer=3.4.1 2018-06-30
ATTLOGStamp=${attlogStamp}`;
};

module.exports = {
  DEFAULT_TRANS_FLAG,
  USERS_ONLY_TRANS_FLAG,
  insertAttendanceLogs,
  handleAttendanceData,
  getTimeResponse,
  getHandshakeResponse,
};
