'use strict';

const fs = require('fs').promises;
const path = require('path');
const queries = require('../db/queries');
const logger = require('../utils/logger');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const formatCompactTimestamp = (dateObj) => {
  const y = String(dateObj.getFullYear());
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${hh}${mm}${ss}`;
};

const saveAttendancePhoto = async ({ sn, pin, photoTime, buffer, size }) => {
  const dateObj = photoTime instanceof Date && !isNaN(photoTime.getTime())
    ? photoTime
    : new Date(photoTime || Date.now());

  const year = String(dateObj.getFullYear());
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  const safeSn = String(sn || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '');
  const safePin = String(pin || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '');
  const compactTs = formatCompactTimestamp(dateObj);

  const dirPath = path.join(UPLOADS_ROOT, 'attphoto', year, month, day);
  await fs.mkdir(dirPath, { recursive: true });

  const fileName = `${safeSn}_${safePin}_${compactTs}.jpg`;
  const fullPath = path.join(dirPath, fileName);
  const relativePath = path.posix.join('uploads/attphoto', year, month, day, fileName);

  // Simpan file biner JPEG ke disk
  await fs.writeFile(fullPath, buffer);

  const actualSize = size || buffer.length;

  // Simpan metadata ke PostgreSQL dan ambil info lengkap pegawai & perangkat
  const photoRecord = await queries.insertAttendancePhoto({
    sn: safeSn,
    pin: safePin,
    photoTime: dateObj,
    filePath: relativePath,
    fileSize: actualSize
  });

  logger.info('Attendance photo saved', {
    id: photoRecord.id,
    sn: safeSn,
    pin: safePin,
    size: actualSize,
    path: relativePath
  });

  return photoRecord;
};

const resolvePhotoAbsolutePath = (relativePath) => {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(__dirname, '../../', normalized);
};

module.exports = {
  saveAttendancePhoto,
  resolvePhotoAbsolutePath
};
