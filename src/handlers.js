'use strict';

const queries = require('./queries');

// Parse raw body from attendance logs
const parseAttendanceLogs = (rawBody) => {
  const lines = rawBody.trim().split('\n');
  const logs = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const fields = line.split('\t');
    if (fields.length < 4) continue;

    const [userPin, checkTimeStr, statusStr, verifyModeStr] = fields;

    // Convert checkTime to ISO format
    const checkTime = checkTimeStr.replace(' ', 'T');
    const status = parseInt(statusStr, 10);
    const verifyMode = parseInt(verifyModeStr, 10);

    logs.push({
      userPin,
      checkTime,
      status,
      verifyMode,
    });
  }

  return logs;
};

// Parse device info from POST /devicecmd
const parseDeviceInfo = (rawBody) => {
  const rawBodyStr = rawBody.toString();
  const normalized = rawBodyStr.replace(/\r?\n/g, '&');
  const pairs = normalized.split('&');
  const info = {};

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      let key = pair.slice(0, eqIdx);
      const val = pair.slice(eqIdx + 1);
      if (key.startsWith('~')) {
        key = key.slice(1);
      }
      info[key] = val;
    }
  }

  // Map keys to consistent format
  const mappedInfo = {};
  const keyMap = {
    'DeviceName': 'deviceName',
    'MAC': 'mac',
    'UserCount': 'userCount',
    'TransactionCount': 'transactionCount',
    'MainTime': 'mainTime',
    'Platform': 'platform',
    'FWVersion': 'fwVersion',
    'IPAddress': 'ipAddress',
  };

  for (const [key, value] of Object.entries(info)) {
    const mappedKey = keyMap[key] || key;
    mappedInfo[mappedKey] = value;
  }

  return mappedInfo;
};

// Handlers for each route
const handleCdataGet = async (sn, ip, type) => {
  await queries.upsertDevice(sn, ip, '+07:00', 'online');

  if (type === 'time') {
    const now = new Date().toISOString().slice(0, 19);
    return `Time=${now}`;
  }

  // Handshake response
  return `GET OPTION FROM: ${sn}
Stamp=9999
OpStamp=9999
PhotoStamp=9999
ErrorDelay=30
Delay=30
TransTimes=00:00;14:05
TransInterval=1
TransFlag=1111000000
Realtime=1
Encrypt=0
TimeZone=+07:00
ServerVer=3.4.1 2018-06-30
ATTLOGStamp=0`;
};

const handleCdataPost = async (sn, rawBody) => {
  const logs = parseAttendanceLogs(rawBody);
  await queries.insertAttendanceLogs(sn, logs);
  return 'OK';
};

const handleGetrequest = async (sn, ip, infoParam) => {
  await queries.upsertDevice(sn, ip, '+07:00', 'online');

  if (infoParam) {
    const decoded = decodeURIComponent(infoParam);
    const parts = decoded.split(',');
    const info = {};
    if (parts[0]) info.fwVersion = parts[0];
    if (parts[1]) info.userCount = parseInt(parts[1]);
    if (parts[2]) info.transactionCount = parseInt(parts[2]);
    if (parts[4]) info.ipAddress = parts[4];
    
    await queries.updateDeviceInfo(sn, info);
    return `C:9:INFO
C:10:CHECK`;
  }

  return 'OK';
};

const handleDevicecmd = async (sn, ip, rawBody) => {
  await queries.upsertDevice(sn, ip, '+07:00', 'online');
  
  const info = parseDeviceInfo(rawBody);
  await queries.updateDeviceInfo(sn, info);
  
  return 'OK';
};

module.exports = {
  parseAttendanceLogs,
  parseDeviceInfo,
  handleCdataGet,
  handleCdataPost,
  handleGetrequest,
  handleDevicecmd,
};
