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

// Parse Face data dari OPERLOG
// Format: FACE PIN=12064\tFID=0\tValid=1\tSIZE=1214\tTMP=stringbase64==
const parseFaceData = (rawBody) => {
  if (!rawBody || typeof rawBody !== 'string') {
    return [];
  }

  const lines = rawBody.trim().split('\n');
  const faces = [];

  for (const line of lines) {
    if (!line || typeof line !== 'string') continue;
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('FACE ') && !trimmedLine.startsWith('FACE\t')) continue;

    // Remove 'FACE' prefix and parse key=value pairs
    const content = trimmedLine.replace(/^FACE[\s\t]+/, '');
    const fields = content.split('\t');
    const faceData = {};

    for (const field of fields) {
      const eqIdx = field.indexOf('=');
      if (eqIdx > 0) {
        const key = field.slice(0, eqIdx).trim().toUpperCase();
        const val = field.slice(eqIdx + 1).trim();
        faceData[key] = val;
      }
    }

    // Only add if PIN, FID, and TMP exist
    if (faceData.PIN && faceData.FID !== undefined && faceData.TMP) {
      faces.push({
        pin: faceData.PIN,
        faceId: parseInt(faceData.FID, 10),
        size: parseInt(faceData.SIZE, 10) || 1214,
        valid: faceData.VALID !== undefined ? parseInt(faceData.VALID, 10) : 1,
        template: faceData.TMP
      });
    }
  }

  return faces;
};

// Parse command execution feedback from POST /devicecmd
// Body format is typically key=value pairs, possibly multiple lines like ID=12&Return=0
const parseCommandResults = (rawBody) => {
  if (!rawBody) {
    return [];
  }
  
  const rawBodyStr = rawBody.toString ? rawBody.toString() : String(rawBody);
  const lines = rawBodyStr.trim().split(/\r?\n/);
  const results = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const info = {};
    const pairs = trimmed.split('&');
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

    if (info.ID) {
      results.push({
        id: parseInt(info.ID, 10),
        returnValue: info.Return !== undefined ? parseInt(info.Return, 10) : null
      });
    }
  }

  return results;
};

// Parse timestamp string from ZKTeco photo filename or field (e.g., '20261014080000' or '2026-10-14 08:00:00')
const parsePhotoTimestamp = (timeStr) => {
  if (!timeStr) return new Date();
  const str = String(timeStr).trim();

  // Format compact 14-digit: YYYYMMDDHHmmss
  const compactMatch = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, y, m, d, hh, mm, ss] = compactMatch;
    const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}`);
    return isNaN(dt.getTime()) ? new Date() : dt;
  }

  // Format standard YYYY-MM-DD HH:mm:ss or ISO
  const normalized = str.replace(' ', 'T');
  const dt = new Date(normalized);
  return isNaN(dt.getTime()) ? new Date() : dt;
};

/**
 * Ekstraksi header ASCII dan body JPEG dari stream biner /iclock/fdata
 * Mendukung delimiter \r\n\r\n, \n\n, atau \0 (sesuai ers.tabledesc.xml endoperator="\0")
 * serta fallback pencarian magic byte JPEG (0xFF 0xD8 0xFF)
 * @param {Buffer} buffer - Raw payload request
 * @returns {Object|null}
 */
const parseAttendancePhotoStream = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  let separatorIdx = -1;
  let headerLength = 0;

  // 1. Cek delimiter \r\n\r\n
  separatorIdx = buffer.indexOf('\r\n\r\n');
  if (separatorIdx !== -1 && separatorIdx < 512) {
    headerLength = separatorIdx + 4;
  }

  // 2. Cek delimiter \n\n
  if (separatorIdx === -1) {
    const lfIdx = buffer.indexOf('\n\n');
    if (lfIdx !== -1 && lfIdx < 512) {
      separatorIdx = lfIdx;
      headerLength = lfIdx + 2;
    }
  }

  // 3. Cek delimiter null-byte \0 (standar ers.tabledesc.xml: CMD=uploadphoto\0<JPEG>)
  if (separatorIdx === -1) {
    const nullIdx = buffer.indexOf(0x00);
    if (nullIdx !== -1 && nullIdx < 512) {
      separatorIdx = nullIdx;
      headerLength = nullIdx + 1;
      // Skip optional trailing \r or \n right after \0
      while (headerLength < buffer.length && (buffer[headerLength] === 0x0a || buffer[headerLength] === 0x0d)) {
        headerLength++;
      }
    }
  }

  // 4. Fallback: cari JPEG SOI marker (FF D8 FF) di 512 byte pertama
  const jpegStart = buffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
  if (separatorIdx === -1 && jpegStart > 0 && jpegStart < 512) {
    separatorIdx = jpegStart;
    headerLength = jpegStart;
  } else if (jpegStart > 0 && jpegStart < 512 && headerLength < jpegStart) {
    // Pastikan jpegBuffer dimulai tepat dari FF D8 FF jika ada byte pemisah ekstra
    headerLength = jpegStart;
  }

  if (separatorIdx === -1 || headerLength >= buffer.length) return null;

  const headerText = buffer.subarray(0, separatorIdx).toString('latin1');
  const jpegBuffer = buffer.subarray(headerLength);

  if (jpegBuffer.length === 0) return null;

  const lines = headerText.split(/[\r\n\t&]+/);
  const metadata = {};
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).replace(/\0/g, '').trim();
      const val = line.slice(eqIdx + 1).replace(/\0/g, '').trim();
      metadata[key] = val;
    }
  }

  // Parse PIN & waktu dari filename (contoh: PIN=20261014080000-12064.jpg atau 20261014080000_12064.jpg)
  let pin = '';
  let photoTimeStr = metadata.time || metadata.PhotoTime || metadata.time_stamp || '';
  const rawPin = metadata.PIN || metadata.pin || '';
  if (rawPin) {
    const cleanPin = rawPin.replace(/\.(jpg|jpeg)$/i, '');
    const match1 = cleanPin.match(/^(\d{14})[-_](.+)$/);
    const match2 = cleanPin.match(/^(.+)[-_](\d{14})$/);
    const match3 = cleanPin.match(/^0[-_](.+)$/);

    if (match1) {
      if (!photoTimeStr) photoTimeStr = match1[1];
      pin = match1[2];
    } else if (match2) {
      pin = match2[1];
      if (!photoTimeStr) photoTimeStr = match2[2];
    } else if (match3) {
      pin = match3[1];
    } else {
      pin = cleanPin;
    }
  }

  if (!pin) return null;

  return {
    pin: String(pin).trim(),
    sn: metadata.SN || metadata.sn || null,
    size: parseInt(metadata.size, 10) || jpegBuffer.length,
    photoTimeStr,
    photoTime: parsePhotoTimestamp(photoTimeStr),
    jpegBuffer
  };
};

/**
 * Parse payload Base64 dari POST /iclock/cdata?table=ATTPHOTO
 * Format: pin=12064\tsn=AEYU...\ttime=2026-10-14 08:00:00\tsize=14250\tphoto=/9j/4AAQ...
 * @param {string} rawBody
 * @returns {Array}
 */
const parseAttendancePhotoBase64 = (rawBody) => {
  if (!rawBody || typeof rawBody !== 'string') return [];

  const lines = rawBody.trim().split(/\r?\n/);
  const photos = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cleanLine = trimmed.replace(/^ATTPHOTO[\s\t]+/i, '');
    const fields = cleanLine.split('\t');
    const data = {};

    for (const field of fields) {
      const eqIdx = field.indexOf('=');
      if (eqIdx > 0) {
        const key = field.slice(0, eqIdx).trim().toLowerCase();
        const val = field.slice(eqIdx + 1).trim();
        data[key] = val;
      }
    }

    const base64Data = data.photo || data.tmp || data.content;
    const rawPin = data.pin || data.user_pin;

    if (rawPin && base64Data) {
      let pin = rawPin;
      let photoTimeStr = data.time || data.phototime || '';

      const cleanPin = rawPin.replace(/\.(jpg|jpeg)$/i, '');
      const match1 = cleanPin.match(/^(\d{14})[-_](.+)$/);
      const match2 = cleanPin.match(/^(.+)[-_](\d{14})$/);
      const match3 = cleanPin.match(/^0[-_](.+)$/);

      if (match1) {
        if (!photoTimeStr) photoTimeStr = match1[1];
        pin = match1[2];
      } else if (match2) {
        pin = match2[1];
        if (!photoTimeStr) photoTimeStr = match2[2];
      } else if (match3) {
        pin = match3[1];
      } else {
        pin = cleanPin;
      }

      const cleanedBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const jpegBuffer = Buffer.from(cleanedBase64, 'base64');
      if (jpegBuffer.length > 0) {
        photos.push({
          pin: String(pin).trim(),
          sn: data.sn || null,
          size: parseInt(data.size, 10) || jpegBuffer.length,
          photoTimeStr,
          photoTime: parsePhotoTimestamp(photoTimeStr),
          jpegBuffer
        });
      }
    }
  }

  return photos;
};

module.exports = {
  parseAttendanceLogs,
  parseDeviceInfo,
  parseUserData,
  parseFingerprintData,
  parseFaceData,
  parseCommandResults,
  parsePhotoTimestamp,
  parseAttendancePhotoStream,
  parseAttendancePhotoBase64,
};
