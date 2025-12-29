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

// Parse USER data dari OPERLOG
// Format: USER PIN=336\t Name=RACHMAT MAULANA\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\tVerify=0\tViceCard=\tStartDatetime=0\tEndDatetime=0
const parseUserData = (rawBody) => {
  if (!rawBody || typeof rawBody !== 'string') {
    return [];
  }

  const lines = rawBody.trim().split('\n');
  const users = [];

  for (const line of lines) {
    if (!line || typeof line !== 'string') continue;
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('USER ')) continue;

    // Remove 'USER ' prefix and parse key=value pairs
    const content = trimmedLine.substring(5);
    const fields = content.split('\t');
    const userData = {};

    for (const field of fields) {
      const eqIdx = field.indexOf('=');
      if (eqIdx > 0) {
        const key = field.slice(0, eqIdx).trim();
        const val = field.slice(eqIdx + 1).trim();
        userData[key] = val;
      }
    }

    // Only add if PIN exists
    if (userData.PIN) {
      users.push({
        pin: userData.PIN,
        name: userData.Name || '',
        privilege: parseInt(userData.Pri, 10) || 0,
        password: userData.Passwd || '',
        card: userData.Card || '',
        groupNo: parseInt(userData.Grp, 10) || 1,
        timezone: userData.TZ || '',
        verifyMode: parseInt(userData.Verify, 10) || 0
      });
    }
  }

  return users;
};

// Parse FP (Fingerprint) data dari OPERLOG
// Format: FP PIN=66\tFID=6\tSize=1656\tValid=1\tTMP=stringbase64==
const parseFingerprintData = (rawBody) => {
  if (!rawBody || typeof rawBody !== 'string') {
    return [];
  }

  const lines = rawBody.trim().split('\n');
  const fingerprints = [];

  for (const line of lines) {
    if (!line || typeof line !== 'string') continue;
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('FP ')) continue;

    // Remove 'FP ' prefix and parse key=value pairs
    const content = trimmedLine.substring(3);
    const fields = content.split('\t');
    const fpData = {};

    for (const field of fields) {
      const eqIdx = field.indexOf('=');
      if (eqIdx > 0) {
        const key = field.slice(0, eqIdx).trim();
        const val = field.slice(eqIdx + 1).trim();
        fpData[key] = val;
      }
    }

    // Only add if PIN, FID, and TMP exist
    if (fpData.PIN && fpData.FID !== undefined && fpData.TMP) {
      fingerprints.push({
        pin: fpData.PIN,
        fingerId: parseInt(fpData.FID, 10),
        template: fpData.TMP
      });
    }
  }

  return fingerprints;
};

module.exports = {
  parseAttendanceLogs,
  parseDeviceInfo,
  parseUserData,
  parseFingerprintData,
};
