'use strict';

const db = require('./connection');
const config = require('../config');
const logger = require('../utils/logger');

// Device operations
const upsertDevice = async (sn, ip, timezone = config.DEVICE.DEFAULT_TIMEZONE) => {
  const query = `
    INSERT INTO devices (sn, ip_address, timezone, last_activity, name, verified)
    VALUES ($1, $2, $3, NOW(), $1, FALSE)
    ON CONFLICT (sn) DO UPDATE SET
      ip_address = EXCLUDED.ip_address,
      timezone = EXCLUDED.timezone,
      last_activity = NOW()
    RETURNING sn
  `;
  return db.query(query, [sn, ip, timezone]);
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

  const startTime = Date.now();
  const timeRange = {
    earliest: logs[0].checkTime,
    latest: logs[logs.length - 1].checkTime
  };

  try {
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

    const result = await db.query(query, params);
    const duration = Date.now() - startTime;

    // Log successful insert with metrics
    logger.info('Attendance logs inserted successfully', {
      sn: sn,
      log_count: logs.length,
      time_range: `${timeRange.earliest} to ${timeRange.latest}`,
      duration_ms: duration,
      affected_rows: result.rowCount
    });

    // Warning if query is slow (> 2 seconds)
    if (duration > 2000) {
      logger.warn('Slow attendance logs insert detected', {
        sn: sn,
        log_count: logs.length,
        duration_ms: duration
      });
    }

    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    
    // Log detailed error information
    logger.error('Failed to insert attendance logs', {
      sn: sn,
      log_count: logs.length,
      time_range: `${timeRange.earliest} to ${timeRange.latest}`,
      duration_ms: duration,
      error: err.message,
      code: err.code,
      hint: err.hint,
      detail: err.detail,
      stack: err.stack
    });
    
    throw err;
  }
};

// Get device verification status
const getDeviceVerificationStatus = async (sn) => {
  const query = `
    SELECT verified FROM devices WHERE sn = $1
  `;
  const result = await db.query(query, [sn]);
  if (result.rows.length === 0) {
    return false;
  }
  return result.rows[0].verified;
};

// Get device info for admin
const getDeviceInfo = async (sn) => {
  const query = `
    SELECT sn, name, last_activity, status, ip_address, verified
    FROM devices_with_status
    WHERE sn = $1
  `;
  const result = await db.query(query, [sn]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

// Check if initial sync is completed
const getInitialSyncStatus = async (sn) => {
  const query = `
    SELECT initial_sync_completed FROM devices WHERE sn = $1
  `;
  const result = await db.query(query, [sn]);
  if (result.rows.length === 0) {
    return false;
  }
  return result.rows[0].initial_sync_completed;
};

// Mark initial sync as completed
const markInitialSyncCompleted = async (sn) => {
  const query = `
    UPDATE devices SET initial_sync_completed = TRUE WHERE sn = $1
  `;
  return db.query(query, [sn]);
};

// Reset initial sync (for admin reupload)
const resetInitialSync = async (sn) => {
  const query = `
    UPDATE devices SET initial_sync_completed = FALSE WHERE sn = $1
  `;
  return db.query(query, [sn]);
};

// Verify a device
const verifyDevice = async (sn) => {
  const query = `
    UPDATE devices SET verified = TRUE WHERE sn = $1
  `;
  return db.query(query, [sn]);
};

// Unverify a device
const unverifyDevice = async (sn) => {
  const query = `
    UPDATE devices SET verified = FALSE WHERE sn = $1
  `;
  return db.query(query, [sn]);
};

// Get all devices
const getAllDevices = async () => {
  const query = `
    SELECT sn, name, ip_address, last_activity, status, verified, initial_sync_completed
    FROM devices_with_status
    ORDER BY last_activity DESC
  `;
  const result = await db.query(query, []);
  return result.rows;
};

// Insert a command into queue
const insertCommand = async (sn, commandType, params = {}) => {
  const query = `
    INSERT INTO device_commands (device_sn, command_type, command_params)
    VALUES ($1, $2, $3)
    RETURNING id, device_sn, command_type, command_params, status, created_at
  `;
  const result = await db.query(query, [sn, commandType, JSON.stringify(params)]);
  return result.rows[0];
};

// Get next pending command for a device (FIFO)
const getNextPendingCommand = async (sn) => {
  const query = `
    SELECT id, device_sn, command_type, command_params, created_at
    FROM device_commands
    WHERE device_sn = $1 AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
  `;
  const result = await db.query(query, [sn]);
  return result.rows[0] || null;
};

// Mark command as executed
const markCommandExecuted = async (id) => {
  const query = `
    UPDATE device_commands
    SET status = 'executed', executed_at = NOW()
    WHERE id = $1
  `;
  return db.query(query, [id]);
};

// Get all pending commands (for admin view)
const getAllPendingCommands = async () => {
  const query = `
    SELECT dc.id, dc.device_sn, dc.command_type, dc.command_params, dc.created_at, d.name as device_name
    FROM device_commands dc
    LEFT JOIN devices d ON dc.device_sn = d.sn
    WHERE dc.status = 'pending'
    ORDER BY dc.created_at ASC
  `;
  const result = await db.query(query, []);
  return result.rows;
};

module.exports = {
  upsertDevice,
  updateDeviceInfo,
  insertAttendanceLogs,
  getDeviceVerificationStatus,
  getDeviceInfo,
  getInitialSyncStatus,
  markInitialSyncCompleted,
  resetInitialSync,
  verifyDevice,
  unverifyDevice,
  getAllDevices,
  insertCommand,
  getNextPendingCommand,
  markCommandExecuted,
  getAllPendingCommands,
};
