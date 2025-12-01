'use strict';

const db = require('./db');

// Device operations
const upsertDevice = async (sn, ip, timezone = '+07:00', status = 'online') => {
  const query = `
    INSERT INTO devices (sn, ip_address, timezone, status, last_activity, name)
    VALUES ($1, $2, $3, $4, NOW(), $1)
    ON CONFLICT (sn) DO UPDATE SET
      ip_address = EXCLUDED.ip_address,
      timezone = EXCLUDED.timezone,
      status = EXCLUDED.status,
      last_activity = NOW()
    RETURNING sn
  `;
  return db.query(query, [sn, ip, timezone, status]);
};

const updateDeviceInfo = async (sn, info) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (info.deviceName !== undefined) {
    updates.push(`name = $${paramCount}`);
    values.push(info.deviceName);
    paramCount++;
  }
  if (info.mac !== undefined) {
    updates.push(`mac = $${paramCount}`);
    values.push(info.mac);
    paramCount++;
  }
  if (info.userCount !== undefined) {
    updates.push(`user_count = $${paramCount}`);
    values.push(info.userCount);
    paramCount++;
  }
  if (info.transactionCount !== undefined) {
    updates.push(`transaction_count = $${paramCount}`);
    values.push(info.transactionCount);
    paramCount++;
  }
  if (info.mainTime !== undefined) {
    updates.push(`main_time = $${paramCount}`);
    values.push(info.mainTime);
    paramCount++;
  }
  if (info.platform !== undefined) {
    updates.push(`platform = $${paramCount}`);
    values.push(info.platform);
    paramCount++;
  }
  if (info.fwVersion !== undefined) {
    updates.push(`fw_version = $${paramCount}`);
    values.push(info.fwVersion);
    paramCount++;
  }
  if (info.ipAddress !== undefined) {
    updates.push(`ip_address = $${paramCount}`);
    values.push(info.ipAddress);
    paramCount++;
  }

  if (updates.length === 0) return null;

  values.push(sn);
  const query = `
    UPDATE devices 
    SET ${updates.join(', ')}, last_activity = NOW()
    WHERE sn = $${paramCount}
  `;
  return db.query(query, values);
};

// Attendance logs operations - BULK INSERT
const insertAttendanceLogs = async (sn, logs) => {
  if (logs.length === 0) return;

  // Build values for bulk insert
  const values = [];
  const params = [];
  let paramCount = 1;

  for (const log of logs) {
    values.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4})`);
    params.push(sn, log.userPin, log.checkTime, log.status, log.verifyMode);
    paramCount += 5;
  }

  const query = `
    INSERT INTO attendance_logs (device_sn, user_pin, check_time, status, verify_mode)
    VALUES ${values.join(', ')}
    ON CONFLICT (device_sn, user_pin, check_time) DO NOTHING
  `;

  return db.query(query, params);
};

// Operation logs operations
const insertOperationLog = async (sn, opcode, adminId, opTime, obj1, obj2, obj3, obj4) => {
  const query = `
    INSERT INTO operation_logs (device_sn, opcode, admin_id, op_time, obj1, obj2, obj3, obj4)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (device_sn, admin_id, op_time) DO NOTHING
    RETURNING id
  `;
  return db.query(query, [sn, opcode, adminId, opTime, obj1, obj2, obj3, obj4]);
};

module.exports = {
  upsertDevice,
  updateDeviceInfo,
  insertAttendanceLogs,
  insertOperationLog,
};
