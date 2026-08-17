'use strict';

const db = require('./connection');
const config = require('../config');
const constants = require('../config/constants');
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
      values.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5})`);
      params.push(sn, log.userPin, log.checkTime, log.status, log.verifyMode, new Date());
      paramCount += 6;
    }

    const query = `
      INSERT INTO attendance_logs (device_sn, user_pin, check_time, status, verify_mode, received_at)
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
    SELECT sn, name, device_name, last_activity, status, ip_address, verified, opd_id, nama_opd, kdunker
    FROM devices_with_status
    WHERE sn = $1
  `;
  const result = await db.query(query, [sn]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

// Get OPD id of a device (cheap lookup for socket broadcast scoping)
const getDeviceOpdId = async (sn) => {
  const result = await db.query('SELECT opd_id FROM devices WHERE sn = $1', [sn]);
  return result.rows[0]?.opd_id || null;
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

// Update device name (admin-set label, works for unverified devices too)
const updateDeviceName = async (sn, deviceName) => {
  const query = `
    UPDATE devices SET device_name = $1 WHERE sn = $2
  `;
  return db.query(query, [deviceName, sn]);
};

// Get all devices (with optional OPD scoping filter)
const getAllDevices = async (opdId = null) => {
  let query = `
    SELECT sn, name, device_name, ip_address, last_activity, status, verified, initial_sync_completed, opd_id, nama_opd, kdunker
    FROM devices_with_status
  `;
  const params = [];
  if (opdId) {
    params.push(opdId);
    query += ` WHERE opd_id = $1`;
  }
  query += ` ORDER BY last_activity DESC`;
  const result = await db.query(query, params);
  return result.rows;
};

// Get offline devices (with optional OPD scoping filter)
const getOfflineDevices = async (opdId = null) => {
  let query = `
    SELECT sn, name, device_name, ip_address, last_activity, status, verified, initial_sync_completed, opd_id, nama_opd, kdunker
    FROM devices_with_status
    WHERE status = 'offline'
  `;
  const params = [];
  if (opdId) {
    params.push(opdId);
    query += ` AND opd_id = $1`;
  }
  query += ` ORDER BY last_activity DESC`;
  const result = await db.query(query, params);
  return result.rows;
};

// Insert a command into queue
const insertCommand = async (sn, commandType, params = {}) => {
  const query = `
    INSERT INTO device_commands (device_sn, command_type, command_params, created_at)
    VALUES ($1, $2, $3, $4)
    RETURNING id, device_sn, command_type, command_params, status, created_at
  `;
  const result = await db.query(query, [sn, commandType, JSON.stringify(params), new Date()]);
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
    SET status = 'executed', executed_at = $2
    WHERE id = $1
  `;
  return db.query(query, [id, new Date()]);
};

// Get all pending commands (for admin view, with optional OPD scoping filter)
const getAllPendingCommands = async (opdId = null) => {
  const query = `
    SELECT dc.id, dc.device_sn, dc.command_type, dc.command_params, dc.created_at, d.device_name as device_name
    FROM device_commands dc
    LEFT JOIN devices d ON dc.device_sn = d.sn
    WHERE dc.status = 'pending'
      ${opdId ? `AND d.opd_id = $1` : ''}
    ORDER BY dc.created_at ASC
  `;
  const params = opdId ? [opdId] : [];
  const result = await db.query(query, params);
  return result.rows;
};

// Upsert pegawai (master data only - privilege/password moved to device mapping)
const upsertPegawai = async (userData) => {
  const query = `
    INSERT INTO pegawai (pin, name, card, group_no, timezone, verify_mode, updated_at, deleted_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL)
    ON CONFLICT (pin) DO UPDATE SET
      name = CASE 
        WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name != '' THEN EXCLUDED.name
        ELSE pegawai.name
      END,
      card = CASE 
        WHEN EXCLUDED.card IS NOT NULL AND EXCLUDED.card != '' THEN EXCLUDED.card
        ELSE pegawai.card
      END,
      group_no = EXCLUDED.group_no,
      timezone = EXCLUDED.timezone,
      verify_mode = EXCLUDED.verify_mode,
      updated_at = NOW(),
      deleted_at = NULL
    WHERE
      (EXCLUDED.name IS NOT NULL AND EXCLUDED.name != '' AND pegawai.name IS DISTINCT FROM EXCLUDED.name) OR
      (EXCLUDED.card IS NOT NULL AND EXCLUDED.card != '' AND pegawai.card IS DISTINCT FROM EXCLUDED.card) OR
      pegawai.group_no IS DISTINCT FROM EXCLUDED.group_no OR
      pegawai.timezone IS DISTINCT FROM EXCLUDED.timezone OR
      pegawai.verify_mode IS DISTINCT FROM EXCLUDED.verify_mode OR
      pegawai.deleted_at IS NOT NULL
    RETURNING pin
  `;
  return db.query(query, [
    userData.pin,
    userData.name,
    userData.card,
    userData.groupNo,
    userData.timezone,
    userData.verifyMode
  ]);
};

// Upsert pegawai-device mapping
const upsertPegawaiDeviceMapping = async (pin, deviceSN, deviceName, privilege = 0, password = null) => {
  const query = `
    INSERT INTO pegawai_device_mapping (pegawai_pin, device_sn, device_name, privilege, password, synced_at, updated_at, deleted_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NULL)
    ON CONFLICT (pegawai_pin, device_sn) DO UPDATE SET
      device_name = CASE 
        WHEN EXCLUDED.device_name IS NOT NULL AND EXCLUDED.device_name != '' THEN EXCLUDED.device_name
        ELSE pegawai_device_mapping.device_name
      END,
      privilege = EXCLUDED.privilege,
      password = CASE 
        WHEN EXCLUDED.password IS NOT NULL AND EXCLUDED.password != '' THEN EXCLUDED.password
        ELSE pegawai_device_mapping.password
      END,
      synced_at = NOW(),
      updated_at = NOW(),
      deleted_at = NULL
    RETURNING id
  `;
  return db.query(query, [pin, deviceSN, deviceName, privilege, password]);
};

// Ensure pegawai-device mapping exists (for fingerprint sync when USER data hasn't arrived)
const ensurePegawaiDeviceMapping = async (pin, deviceSN) => {
  // First check if pegawai exists
  const checkPegawai = await db.query('SELECT pin FROM pegawai WHERE pin = $1', [pin]);
  if (checkPegawai.rows.length === 0) {
    // Create placeholder pegawai
    await db.query(`
      INSERT INTO pegawai (pin, name, updated_at, deleted_at)
      VALUES ($1, $1, NOW(), NULL)
      ON CONFLICT (pin) DO NOTHING
    `, [pin]);
  } else {
    // If pegawai exists, we should make sure deleted_at is null if it was soft-deleted
    await db.query(`
      UPDATE pegawai SET deleted_at = NULL, updated_at = NOW() WHERE pin = $1 AND deleted_at IS NOT NULL
    `, [pin]);
  }

  // Then ensure mapping exists
  const query = `
    INSERT INTO pegawai_device_mapping (pegawai_pin, device_sn, synced_at, updated_at, deleted_at)
    VALUES ($1, $2, NOW(), NOW(), NULL)
    ON CONFLICT (pegawai_pin, device_sn) DO UPDATE SET
      deleted_at = NULL,
      updated_at = NOW(),
      synced_at = NOW()
    RETURNING id
  `;
  return db.query(query, [pin, deviceSN]);
};

// Upsert fingerprint
const upsertFingerprint = async (pin, deviceSN, fingerId, template) => {
  const query = `
    INSERT INTO pegawai_fingerprints (pegawai_pin, device_sn, finger_id, template, synced_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (pegawai_pin, device_sn, finger_id) DO UPDATE SET
      template = EXCLUDED.template,
      synced_at = NOW()
    WHERE
      pegawai_fingerprints.template != EXCLUDED.template
    RETURNING id
  `;
  return db.query(query, [pin, deviceSN, fingerId, template]);
};

// Get pegawai with fingerprint summary across all devices
const getPegawaiWithFingerprints = async (pin, opdId = null) => {
  const pegawaiQuery = `
    SELECT e.*, 
           (SELECT COUNT(*) FROM pegawai_fingerprints ef WHERE ef.pegawai_pin = e.pin) as total_fingerprints
    FROM pegawai e
    WHERE e.pin = $1 AND e.deleted_at IS NULL
      ${opdId ? `AND (e.opd_id = $2 OR EXISTS (
        SELECT 1 FROM pegawai_device_mapping pdm
        JOIN devices dv ON pdm.device_sn = dv.sn
        WHERE pdm.pegawai_pin = e.pin AND pdm.deleted_at IS NULL AND dv.opd_id = $2
      ))` : ''}
  `;
  const pegawaiParams = opdId ? [pin, opdId] : [pin];
  const pegawaiResult = await db.query(pegawaiQuery, pegawaiParams);
  if (pegawaiResult.rows.length === 0) {
    return null;
  }

  const pegawai = pegawaiResult.rows[0];

  // Get device mappings with privilege/password
  const mappingQuery = `
    SELECT edm.device_sn, edm.device_name, edm.privilege, edm.password, edm.synced_at,
           (SELECT COUNT(*) FROM pegawai_fingerprints ef 
            WHERE ef.pegawai_pin = edm.pegawai_pin AND ef.device_sn = edm.device_sn) as fingerprint_count
    FROM pegawai_device_mapping edm
    WHERE edm.pegawai_pin = $1 AND edm.deleted_at IS NULL
      ${opdId ? `AND EXISTS (SELECT 1 FROM devices dv WHERE dv.sn = edm.device_sn AND dv.opd_id = $2)` : ''}
    ORDER BY edm.synced_at DESC
  `;
  const mappingParams = opdId ? [pin, opdId] : [pin];
  const mappingResult = await db.query(mappingQuery, mappingParams);

  return {
    ...pegawai,
    devices: mappingResult.rows.map(row => ({
      ...row,
      privilege_label: constants.PRIVILEGES_LEVELS[row.privilege] || 'Unknown'
    }))
  };
};

// Get all pegawai at a specific device (privilege/password from device mapping)
const getPegawaiByDevice = async (deviceSN, limit = null, offset = null, search = null) => {
  let selectQuery = `
    SELECT e.pin, e.name, edm.privilege, edm.password, edm.synced_at,
           (SELECT COUNT(*) FROM pegawai_fingerprints ef 
            WHERE ef.pegawai_pin = e.pin AND ef.device_sn = $1) as fingerprint_count
    FROM pegawai e
    JOIN pegawai_device_mapping edm ON e.pin = edm.pegawai_pin
    WHERE edm.device_sn = $1 AND edm.deleted_at IS NULL AND e.deleted_at IS NULL
  `;
  const params = [deviceSN];

  if (search) {
    params.push(`%${search}%`);
    selectQuery += ` AND (e.name ILIKE $${params.length} OR e.pin ILIKE $${params.length})`;
  }

  selectQuery += ` ORDER BY e.name ASC`;

  if (limit !== null) {
    params.push(limit);
    selectQuery += ` LIMIT $${params.length}`;
  }

  if (offset !== null) {
    params.push(offset);
    selectQuery += ` OFFSET $${params.length}`;
  }

  const result = await db.query(selectQuery, params);

  // Get total count matching current search filter
  let countQuery = `
    SELECT COUNT(*) 
    FROM pegawai e
    JOIN pegawai_device_mapping edm ON e.pin = edm.pegawai_pin
    WHERE edm.device_sn = $1 AND edm.deleted_at IS NULL AND e.deleted_at IS NULL
  `;
  const countParams = [deviceSN];

  if (search) {
    countParams.push(`%${search}%`);
    countQuery += ` AND (e.name ILIKE $${countParams.length} OR e.pin ILIKE $${countParams.length})`;
  }
  const countResult = await db.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count, 10);

  // Get overall count mapping (without search filter) for "Pegawai Count" card
  const overallCountQuery = `
    SELECT COUNT(*) 
    FROM pegawai e
    JOIN pegawai_device_mapping edm ON e.pin = edm.pegawai_pin
    WHERE edm.device_sn = $1 AND edm.deleted_at IS NULL AND e.deleted_at IS NULL
  `;
  const overallCountResult = await db.query(overallCountQuery, [deviceSN]);
  const count = parseInt(overallCountResult.rows[0].count, 10);

  const rows = result.rows.map(row => ({
    ...row,
    privilege_label: constants.PRIVILEGES_LEVELS[row.privilege] || 'Unknown'
  }));

  return {
    rows,
    total,
    count
  };
};

// Get fingerprints for transfer
const getPegawaiFingerprints = async (pin, deviceSN) => {
  const query = `
    SELECT ef.finger_id, ef.template, ef.synced_at
    FROM pegawai_fingerprints ef
    WHERE ef.pegawai_pin = $1 AND ef.device_sn = $2
    ORDER BY ef.finger_id ASC
  `;
  const result = await db.query(query, [pin, deviceSN]);
  return result.rows;
};

// List all pegawai with pagination, search, and optional OPD scoping filter
const listPegawai = async ({ limit = 25, offset = 0, search = null, opdId = null } = {}) => {
  let whereClauses = ['p.deleted_at IS NULL'];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    whereClauses.push(`(p.name ILIKE $${params.length} OR p.pin ILIKE $${params.length})`);
  }

  if (opdId) {
    params.push(opdId);
    whereClauses.push(`(p.opd_id = $${params.length} OR EXISTS (
      SELECT 1 FROM pegawai_device_mapping pdm
      JOIN devices dv ON pdm.device_sn = dv.sn
      WHERE pdm.pegawai_pin = p.pin AND pdm.deleted_at IS NULL AND dv.opd_id = $${params.length}
    ))`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count
    FROM pegawai p
    ${whereSql}
  `;
  const countRes = await db.query(countQuery, params);
  const total = parseInt(countRes.rows[0]?.count || 0, 10);

  // Get paginated data
  const dataParams = [...params];
  dataParams.push(limit);
  const limitIdx = dataParams.length;
  dataParams.push(offset);
  const offsetIdx = dataParams.length;

  const dataQuery = `
    SELECT 
      p.pin, 
      p.name, 
      p.card, 
      p.group_no, 
      p.timezone, 
      p.opd_id,
      o.nama_opd, 
      o.kdunker,
      (SELECT COUNT(*) FROM pegawai_fingerprints ef WHERE ef.pegawai_pin = p.pin) as total_fingerprints,
      (SELECT COUNT(*) FROM pegawai_device_mapping pdm WHERE pdm.pegawai_pin = p.pin AND pdm.deleted_at IS NULL) as total_devices
    FROM pegawai p
    LEFT JOIN opds o ON p.opd_id = o.id
    ${whereSql}
    ORDER BY p.name ASC NULLS LAST, p.pin ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const dataRes = await db.query(dataQuery, dataParams);

  return {
    rows: dataRes.rows,
    total
  };
};

// Search pegawai by name using ILIKE (with optional OPD scoping filter)
const searchPegawaiByName = async (name, limit = 10, opdId = null) => {
  const query = `
    SELECT p.pin, p.name, p.card, p.group_no, p.timezone,
           (SELECT COUNT(*) FROM pegawai_fingerprints ef WHERE ef.pegawai_pin = p.pin) as total_fingerprints
    FROM pegawai p
    WHERE p.name ILIKE $1 AND p.deleted_at IS NULL
      ${opdId ? `AND (p.opd_id = $2 OR EXISTS (
        SELECT 1 FROM pegawai_device_mapping pdm
        JOIN devices dv ON pdm.device_sn = dv.sn
        WHERE pdm.pegawai_pin = p.pin AND pdm.deleted_at IS NULL AND dv.opd_id = $2
      ))` : ''}
    ORDER BY p.name ASC
    LIMIT $${opdId ? 3 : 2}
  `;
  const params = opdId ? [`%${name}%`, opdId, limit] : [`%${name}%`, limit];
  const result = await db.query(query, params);
  return result.rows;
};

// Get attendance logs (with optional OPD scoping filter)
const getAttendanceLogs = async (limit = 100, offset = 0, sn = null, pin = null, year = null, month = null, startDate = null, endDate = null, search = null, opdId = null) => {
  let query = `
    SELECT 
      a.device_sn, 
      a.user_pin, 
      a.check_time, 
      a.status, 
      a.verify_mode, 
      a.received_at,
      p.name as pegawai_name,
      d.device_name as device_name,
      d.opd_id as device_opd_id,
      o.nama_opd as nama_opd
    FROM attendance_logs a
    LEFT JOIN pegawai p ON a.user_pin = p.pin
    LEFT JOIN devices d ON a.device_sn = d.sn
    LEFT JOIN opds o ON o.id = d.opd_id
    WHERE 1=1
  `;
  const params = [];

  if (opdId) {
    params.push(opdId);
    query += ` AND d.opd_id = $${params.length}`;
  }

  if (sn) {
    params.push(sn);
    query += ` AND a.device_sn = $${params.length}`;
  }

  if (pin) {
    params.push(pin);
    query += ` AND a.user_pin = $${params.length}`;
  }

  if (startDate) {
    params.push(startDate);
    query += ` AND a.check_time >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    query += ` AND a.check_time <= $${params.length}::timestamp + interval '1 day' - interval '1 second'`;
  }

  if (!startDate && !endDate) {
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      
      let nextY = y;
      let nextM = m + 1;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
      
      params.push(start, end);
      query += ` AND a.check_time >= $${params.length - 1} AND a.check_time < $${params.length}`;
    } else if (year) {
      const y = parseInt(year);
      const start = `${y}-01-01`;
      const end = `${y + 1}-01-01`;
      
      params.push(start, end);
      query += ` AND a.check_time >= $${params.length - 1} AND a.check_time < $${params.length}`;
    } else if (month) {
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM a.check_time) = $${params.length}`;
    }
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (p.name ILIKE $${params.length} OR a.user_pin ILIKE $${params.length})`;
  }

  query += ` ORDER BY a.check_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(query, params);

  let countQuery = `
    SELECT COUNT(*) 
    FROM attendance_logs a
    LEFT JOIN pegawai p ON a.user_pin = p.pin
    LEFT JOIN devices d ON a.device_sn = d.sn
    WHERE 1=1
  `;
  const countParams = [];

  if (opdId) {
    countParams.push(opdId);
    countQuery += ` AND d.opd_id = $${countParams.length}`;
  }

  if (sn) { countParams.push(sn); countQuery += ` AND a.device_sn = $${countParams.length}`; }
  if (pin) { countParams.push(pin); countQuery += ` AND a.user_pin = $${countParams.length}`; }

  if (startDate) {
    countParams.push(startDate);
    countQuery += ` AND a.check_time >= $${countParams.length}`;
  }
  if (endDate) {
    countParams.push(endDate);
    countQuery += ` AND a.check_time <= $${countParams.length}::timestamp + interval '1 day' - interval '1 second'`;
  }

  if (!startDate && !endDate) {
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      
      let nextY = y;
      let nextM = m + 1;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
      
      countParams.push(start, end);
      countQuery += ` AND a.check_time >= $${countParams.length - 1} AND a.check_time < $${countParams.length}`;
    } else if (year) {
      const y = parseInt(year);
      const start = `${y}-01-01`;
      const end = `${y + 1}-01-01`;
      
      countParams.push(start, end);
      countQuery += ` AND a.check_time >= $${countParams.length - 1} AND a.check_time < $${countParams.length}`;
    } else if (month) {
      countParams.push(month);
      countQuery += ` AND EXTRACT(MONTH FROM a.check_time) = $${countParams.length}`;
    }
  }

  if (search) {
    countParams.push(`%${search}%`);
    countQuery += ` AND (p.name ILIKE $${countParams.length} OR a.user_pin ILIKE $${countParams.length})`;
  }

  const countRes = await db.query(countQuery, countParams);

  return {
    data: rows,
    total: parseInt(countRes.rows[0].count)
  };
};

// Get dashboard statistics (with optional OPD filter)
const getDashboardStats = async (opdId = null) => {
  let query;
  let params = [];

  if (opdId) {
    params = [opdId];
    query = `
      SELECT
        (SELECT COUNT(*) FROM opds WHERE id = $1 AND deleted_at IS NULL) AS total_opd,
        (SELECT COUNT(*) FROM pegawai p WHERE p.deleted_at IS NULL AND p.opd_id = $1) AS total_pegawai,
        (SELECT COUNT(*) FROM pegawai_fingerprints pf JOIN pegawai p ON pf.pegawai_pin = p.pin WHERE p.opd_id = $1) AS total_fingerprints,
        (SELECT COUNT(*) FROM pegawai_device_mapping pdm JOIN pegawai p ON pdm.pegawai_pin = p.pin WHERE pdm.privilege > 0 AND pdm.deleted_at IS NULL AND p.opd_id = $1) AS total_admins,
        (SELECT COUNT(*) FROM attendance_logs a JOIN devices d ON a.device_sn = d.sn WHERE a.check_time >= CURRENT_DATE AND d.opd_id = $1) AS logs_today,
        (SELECT COUNT(*) FROM attendance_logs a JOIN devices d ON a.device_sn = d.sn WHERE a.check_time >= CURRENT_DATE - INTERVAL '7 days' AND d.opd_id = $1) AS logs_weekly,
        (SELECT COUNT(*) FROM attendance_logs a JOIN devices d ON a.device_sn = d.sn WHERE a.check_time >= DATE_TRUNC('month', CURRENT_DATE) AND d.opd_id = $1) AS logs_monthly
    `;
  } else {
    query = `
      SELECT
        (SELECT COUNT(*) FROM opds WHERE deleted_at IS NULL) AS total_opd,
        (SELECT COUNT(*) FROM pegawai WHERE deleted_at IS NULL) AS total_pegawai,
        (SELECT COUNT(*) FROM pegawai_fingerprints) AS total_fingerprints,
        (SELECT COUNT(*) FROM pegawai_device_mapping WHERE privilege > 0 AND deleted_at IS NULL) AS total_admins,
        (SELECT COUNT(*) FROM attendance_logs WHERE check_time >= CURRENT_DATE) AS logs_today,
        (SELECT COUNT(*) FROM attendance_logs WHERE check_time >= CURRENT_DATE - INTERVAL '7 days') AS logs_weekly,
        (SELECT COUNT(*) FROM attendance_logs WHERE check_time >= DATE_TRUNC('month', CURRENT_DATE)) AS logs_monthly
    `;
  }

  const result = await db.query(query, params);
  return result.rows[0];
};

// Get pegawai basic info for DATA USER command (includes device-specific privilege)
const getPegawaiBasicInfo = async (pin, deviceSN = null) => {
  if (deviceSN) {
    // Get privilege from specific device
    const query = `
      SELECT e.pin, e.name, edm.privilege, e.timezone, e.group_no
      FROM pegawai e
      LEFT JOIN pegawai_device_mapping edm ON e.pin = edm.pegawai_pin AND edm.device_sn = $2
      WHERE e.pin = $1
    `;
    const result = await db.query(query, [pin, deviceSN]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...row,
      privilege_label: constants.PRIVILEGES_LEVELS[row.privilege] || 'Unknown'
    };
  }
  // Fallback: get basic info without device-specific privilege
  const query = `
    SELECT pin, name, 0 as privilege, timezone, group_no
    FROM pegawai
    WHERE pin = $1
  `;
  const result = await db.query(query, [pin]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    privilege_label: constants.PRIVILEGES_LEVELS[row.privilege] || 'Unknown'
  };
};

// Get a command by ID
const getCommandById = async (id) => {
  const query = `
    SELECT id, device_sn, command_type, command_params, status
    FROM device_commands
    WHERE id = $1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

// Update command status
const updateCommandStatus = async (id, status) => {
  const query = `
    UPDATE device_commands
    SET status = $2, executed_at = NOW()
    WHERE id = $1
  `;
  return db.query(query, [id, status]);
};

// Soft delete pegawai device mapping
const softDeletePegawaiDeviceMapping = async (pin, deviceSN) => {
  const query = `
    UPDATE pegawai_device_mapping
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE pegawai_pin = $1 AND device_sn = $2
  `;
  return db.query(query, [pin, deviceSN]);
};

// Hard delete fingerprints from specific device
const deletePegawaiFingerprints = async (pin, deviceSN) => {
  const query = `
    DELETE FROM pegawai_fingerprints
    WHERE pegawai_pin = $1 AND device_sn = $2
  `;
  return db.query(query, [pin, deviceSN]);
};

// Count active mappings for a pegawai
const countActiveDeviceMappings = async (pin) => {
  const query = `
    SELECT COUNT(*)::integer as count
    FROM pegawai_device_mapping
    WHERE pegawai_pin = $1 AND deleted_at IS NULL
  `;
  const result = await db.query(query, [pin]);
  return result.rows[0].count;
};

// Soft delete pegawai master record
const softDeletePegawai = async (pin) => {
  const query = `
    UPDATE pegawai
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE pin = $1
  `;
  return db.query(query, [pin]);
};

// Get pegawai profile for PDF export with OPD details and scoping
const getPegawaiProfileForExport = async (pin, opdId = null) => {
  let query = `
    SELECT 
      p.pin, 
      p.name, 
      p.card, 
      p.group_no, 
      p.timezone, 
      p.verify_mode, 
      p.opd_id,
      o.nama_opd, 
      o.kdunker
    FROM pegawai p
    LEFT JOIN opds o ON p.opd_id = o.id
    WHERE p.pin = $1 AND p.deleted_at IS NULL
  `;
  const params = [pin];
  if (opdId) {
    params.push(opdId);
    query += ` AND (p.opd_id = $2 OR EXISTS (
      SELECT 1 FROM pegawai_device_mapping pdm
      JOIN devices dv ON pdm.device_sn = dv.sn
      WHERE pdm.pegawai_pin = p.pin AND pdm.deleted_at IS NULL AND dv.opd_id = $2
    ))`;
  }
  const result = await db.query(query, params);
  return result.rows[0] || null;
};

// Get monthly logs for pegawai for PDF export
const getMonthlyLogsForPegawai = async (pin, startDate, endDate, opdId = null) => {
  let query = `
    SELECT 
      a.device_sn, 
      a.user_pin, 
      a.check_time, 
      a.status, 
      a.verify_mode, 
      d.device_name,
      d.opd_id as device_opd_id
    FROM attendance_logs a
    LEFT JOIN devices d ON a.device_sn = d.sn
    WHERE a.user_pin = $1 
      AND a.check_time >= $2 
      AND a.check_time < $3
  `;
  const params = [pin, startDate, endDate];
  if (opdId) {
    params.push(opdId);
    query += ` AND d.opd_id = $4`;
  }
  query += ` ORDER BY a.check_time ASC`;
  const result = await db.query(query, params);
  return result.rows;
};

module.exports = {
  upsertDevice,
  updateDeviceInfo,
  insertAttendanceLogs,
  getDeviceVerificationStatus,
  getDeviceInfo,
  getDeviceOpdId,
  getInitialSyncStatus,
  markInitialSyncCompleted,
  resetInitialSync,
  verifyDevice,
  unverifyDevice,
  updateDeviceName,
  getAllDevices,
  getOfflineDevices,
  insertCommand,
  getNextPendingCommand,
  markCommandExecuted,
  getAllPendingCommands,
  upsertPegawai,
  upsertPegawaiDeviceMapping,
  ensurePegawaiDeviceMapping,
  upsertFingerprint,
  getPegawaiWithFingerprints,
  getPegawaiByDevice,
  getPegawaiFingerprints,
  getPegawaiBasicInfo,
  listPegawai,
  searchPegawaiByName,
  getAttendanceLogs,
  getDashboardStats,
  getCommandById,
  updateCommandStatus,
  softDeletePegawaiDeviceMapping,
  deletePegawaiFingerprints,
  countActiveDeviceMappings,
  softDeletePegawai,
  getPegawaiProfileForExport,
  getMonthlyLogsForPegawai,
};

