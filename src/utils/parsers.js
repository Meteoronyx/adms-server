'use strict';

// Parse raw body from attendance logs
const parseAttendanceLogs = (rawBody) => {
  // Handle undefined or null rawBody
  if (!rawBody || typeof rawBody !== 'string') {
    return [];
  }
  
  const lines = rawBody.trim().split('\n');
  const logs = [];

  for (const line of lines) {
    // Skip undefined, null, or empty lines
    if (!line || typeof line !== 'string') continue;
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const fields = trimmedLine.split('\t');
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
  // Handle undefined or null rawBody
  if (!rawBody) {
    return {};
  }
  
  const rawBodyStr = rawBody.toString ? rawBody.toString() : String(rawBody);
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

module.exports = {
  parseAttendanceLogs,
  parseDeviceInfo,
};
