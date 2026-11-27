'use strict';

const queries = require('../db/queries');
const config = require('../config');
const logger = require('../utils/logger');
const parsers = require('../utils/parsers');

const MAX_SHELL_CMD_LENGTH = 78;

const normalizeServerUrl = (serverUrl) => {
  const trimmed = String(serverUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
};

const buildShellStagingCommand = (cmdId, serverUrl) => {
  const baseUrl = normalizeServerUrl(serverUrl);
  if (!baseUrl) {
    throw new Error('serverUrl is required for SHELL staging command');
  }
  const shellPayload = `wget -qO /tmp/r.sh ${baseUrl}/r/${cmdId} && sh /tmp/r.sh`;
  if (shellPayload.length > MAX_SHELL_CMD_LENGTH) {
    throw new Error(
      `SHELL payload exceeds ${MAX_SHELL_CMD_LENGTH} chars (${shellPayload.length}): ${shellPayload}`
    );
  }
  return shellPayload;
};

const buildCommandString = (command) => {
  const { id, command_type, command_params } = command;
  const cmdId = id !== undefined && id !== null ? id : 10;
  const prefix = `C:${cmdId}:`;

  switch (command_type) {
    case config.COMMAND_TYPES.CLEAR_LOG:
      return `${prefix}CLEAR LOG`;

    case config.COMMAND_TYPES.INFO:
      return `${prefix}INFO`;

    case config.COMMAND_TYPES.REBOOT:
      return `${prefix}REBOOT`;

    case config.COMMAND_TYPES.DATA_USER: {
      // Format: C:<id>:DATA USER PIN=1\tName=John\tPri=0
      const { pin, privilege = 0, passwd, name } = command_params;
      let cmd = `${prefix}DATA USER PIN=${pin}`;
      if (name !== undefined && name !== null && name !== '') {
        cmd += `\tName=${name}`;
      }
      cmd += `\tPri=${privilege}`;
      if (passwd !== undefined && passwd !== null && passwd !== '') {
        cmd += `\tPasswd=${passwd}`;
      }
      return cmd;
    }

    case config.COMMAND_TYPES.DELETE_USER:
      // Format: C:<id>:DATA DEL_USER PIN=1
      return `${prefix}DATA DEL_USER PIN=${command_params.pin}`;

    case config.COMMAND_TYPES.ENROLL_FP: {
      // Format: C:<id>:ENROLL_FP PIN=8888\tFID=0\tRETRY=3\tOVERWRITE=0
      const { pin: fpPin, fid, retry = 3, overwrite = 0 } = command_params;
      return `${prefix}ENROLL_FP PIN=${fpPin}\tFID=${fid}\tRETRY=${retry}\tOVERWRITE=${overwrite}`;
    }

    case config.COMMAND_TYPES.DATA_FP: {
      // Format: C:<id>:DATA FP PIN=xxx\tFID=x\tSize=x\tValid=1\tTMP=base64
      const { pin: dataFpPin, finger_id, template, size: explicitSize } = command_params;
      const size = explicitSize || (template ? Buffer.from(template, 'base64').length : 0);
      return `${prefix}DATA FP PIN=${dataFpPin}\tFID=${finger_id}\tSize=${size}\tValid=1\tTMP=${template}`;
    }

    case config.COMMAND_TYPES.DATA_FACE: {
      // Format: C:<id>:DATA UPDATE FACE PIN=xxx\tFID=x\tValid=1\tSIZE=xxx\tTMP=base64
      // Note: SIZE must be uppercase per ers.tabledesc.xml to populate the Size column in SQLite
      const { pin, face_id, size, valid = 1, template } = command_params;
      const sizeVal = size || (template ? Buffer.from(template, 'base64').length : 1214);
      return `${prefix}DATA UPDATE FACE PIN=${pin}\tFID=${face_id}\tValid=${valid}\tSIZE=${sizeVal}\tTMP=${template}`;
    }

    case config.COMMAND_TYPES.DATA_SMS: {
      // Format: C:<id>:DATA UPDATE SMS MSG=xxx\tTAG=253\tUID=xxx\tMIN=xxx\tStartTime=yyyy-MM-dd HH:mm:ss
      const { uid, message, duration = 0, startTime, tag = 253 } = command_params;

      let timeStr = startTime;
      if (!timeStr || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(timeStr))) {
        const dt = timeStr ? new Date(timeStr) : new Date();
        const validDt = isNaN(dt.getTime()) ? new Date() : dt;
        // Format in local machine timezone (Asia/Jakarta / +07:00)
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(validDt);
        const map = {};
        for (const p of parts) map[p.type] = p.value;
        const hour = map.hour === '24' ? '00' : map.hour;
        timeStr = `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
      }

      const sanitizedMsg = String(message || '').replace(/[\t\r\n]+/g, ' ').trim().slice(0, 320);
      return `${prefix}DATA UPDATE SMS MSG=${sanitizedMsg}\tTAG=${tag}\tUID=${uid}\tMIN=${duration}\tStartTime=${timeStr}`;
    }

    case config.COMMAND_TYPES.DELETE_SMS: {
      // Format: C:<id>:DATA DELETE SMS UID=xxx
      const { uid } = command_params;
      return `${prefix}DATA DELETE SMS UID=${uid}`;
    }

    case config.COMMAND_TYPES.SET_OPTION: {
      // Format: C:<id>:SET OPTION Name=Value
      const { name, value, option } = command_params;
      const optionString = option || `${name}=${value}`;
      return `${prefix}SET OPTION ${optionString}`;
    }

    case config.COMMAND_TYPES.SHELL: {
      const { command: rawCmd, serverUrl } = command_params || {};
      const shellPayload = rawCmd
        ? String(rawCmd).trim()
        : buildShellStagingCommand(cmdId, serverUrl);
      if (shellPayload.length > MAX_SHELL_CMD_LENGTH) {
        logger.error('SHELL command exceeds 78-char firmware limit', {
          cmdId,
          length: shellPayload.length
        });
        return null;
      }
      return `${prefix}SHELL ${shellPayload}`;
    }

    default:
      return null;
  }
};

const queueCommand = async (sn, commandType, params = {}) => {
  return queries.insertCommand(sn, commandType, params);
};

const getAndExecuteNext = async (sn) => {
  const command = queries.claimNextPendingCommand
    ? await queries.claimNextPendingCommand(sn)
    : await queries.getNextPendingCommand(sn);

  if (!command) {
    return null;
  }

  const commandString = buildCommandString(command);

  if (commandString) {
    if (!queries.claimNextPendingCommand) {
      await queries.markCommandExecuted(command.id);
    }
    return {
      id: command.id,
      type: command.command_type,
      commandString
    };
  }

  await queries.updateCommandStatus(command.id, 'failed', null, 'Invalid or oversized command payload');
  return null;
};

const getQueueStatus = async (opdId = null, options = {}) => {
  if (
    options.limit !== undefined ||
    options.offset !== undefined ||
    options.status !== undefined ||
    options.search ||
    options.commandType ||
    options.all !== undefined
  ) {
    return queries.getDeviceCommands({ opdId, ...options });
  }
  return queries.getAllPendingCommands(opdId);
};

const getQueueCount = async (opdId = null) => {
  return queries.getPendingCommandsCount(opdId);
};

const parseCommandParams = (rawParams) => {
  if (!rawParams) return {};
  if (typeof rawParams === 'string') {
    try {
      return JSON.parse(rawParams) || {};
    } catch {
      return {};
    }
  }
  return typeof rawParams === 'object' ? rawParams : {};
};

const sanitizeDeviceInfoFromCmd = (parsed) => {
  const info = {};
  if (parsed.deviceName !== undefined) info.deviceName = parsed.deviceName;
  if (parsed.mac !== undefined) info.mac = parsed.mac;
  if (parsed.mainTime !== undefined) info.mainTime = parsed.mainTime;
  if (parsed.platform !== undefined) info.platform = parsed.platform;
  if (parsed.fwVersion !== undefined) info.fwVersion = parsed.fwVersion;
  if (parsed.ipAddress !== undefined) info.ipAddress = parsed.ipAddress;

  if (parsed.userCount !== undefined) {
    const userCount = parseInt(parsed.userCount, 10);
    if (Number.isFinite(userCount)) info.userCount = userCount;
  }
  if (parsed.transactionCount !== undefined) {
    const transactionCount = parseInt(parsed.transactionCount, 10);
    if (Number.isFinite(transactionCount)) info.transactionCount = transactionCount;
  }
  return info;
};

const syncBiometricCommandToDb = async (sn, id, commandType, cmdParams) => {
  const pin = cmdParams.pin !== undefined && cmdParams.pin !== null ? String(cmdParams.pin).trim() : '';

  if (commandType === config.COMMAND_TYPES.DATA_USER) {
    if (!pin) {
      logger.warn('Skipping DATA_USER auto-sync due to missing pin', { sn, id });
      return;
    }

    const name = cmdParams.name !== undefined && cmdParams.name !== null ? String(cmdParams.name).trim() : '';
    const privilege = Number.isFinite(Number(cmdParams.privilege)) ? Number(cmdParams.privilege) : 0;
    const passwd = cmdParams.passwd || null;

    await queries.ensurePegawaiBasicInfo(pin, name);
    const deviceInfo = await queries.getDeviceInfo(sn);
    await queries.upsertPegawaiDeviceMapping(pin, sn, deviceInfo?.device_name || null, privilege, passwd);
    logger.info('Auto-synced pegawai to target device mapping after DATA_USER success', { pin, sn });
    return;
  }

  if (commandType === config.COMMAND_TYPES.DATA_FP) {
    const fingerId = Number(cmdParams.finger_id);
    const template = cmdParams.template;

    if (!pin || !Number.isFinite(fingerId) || !template) {
      logger.warn('Skipping DATA_FP auto-sync due to incomplete command_params', {
        sn,
        id,
        hasPin: Boolean(pin),
        fingerId: cmdParams.finger_id,
        hasTemplate: Boolean(template)
      });
      return;
    }

    if (cmdParams.user_info?.name) {
      await queries.ensurePegawaiBasicInfo(pin, String(cmdParams.user_info.name).trim());
    }
    await queries.ensurePegawaiDeviceMapping(pin, sn);
    await queries.upsertFingerprint(pin, sn, fingerId, template);
    logger.info('Auto-synced fingerprint to target device after DATA_FP success', { pin, sn, fingerId });
    return;
  }

  if (commandType === config.COMMAND_TYPES.DATA_FACE) {
    const faceId = Number(cmdParams.face_id);
    const size = Number(cmdParams.size) || 1214;
    const valid = cmdParams.valid !== undefined ? Number(cmdParams.valid) : 1;
    const template = cmdParams.template;

    if (!pin || !Number.isFinite(faceId) || !template) {
      logger.warn('Skipping DATA_FACE auto-sync due to incomplete command_params', {
        sn,
        id,
        hasPin: Boolean(pin),
        faceId: cmdParams.face_id,
        hasTemplate: Boolean(template)
      });
      return;
    }

    await queries.ensurePegawaiDeviceMapping(pin, sn);
    await queries.upsertFace(pin, sn, faceId, size, valid, template);
    logger.info('Auto-synced face template to target device after DATA_FACE success', { pin, sn, faceId });
  }
};

const processCommandResult = async (sn, id, returnValue, content = null) => {
  const command = await queries.getCommandById(id);
  if (!command) {
    logger.warn('Received command result for unknown command ID', { sn, id, returnValue });
    return;
  }

  // Idempotency guard: firmware (e.g. X601) may POST /iclock/devicecmd twice for the same ID
  if (command.status === 'success') {
    logger.debug('Ignoring duplicate command result for already-succeeded command', {
      sn,
      id,
      type: command.command_type,
      returnValue
    });
    return;
  }

  const normalizedContent = content ? String(content).trim() : null;

  if (returnValue !== 0) {
    await queries.updateCommandStatus(id, 'failed', returnValue, normalizedContent);
    logger.info('Command execution status updated', { sn, id, type: command.command_type, status: 'failed', returnValue });
    return;
  }

  const cmdParams = parseCommandParams(command.command_params);

  if (command.command_type === config.COMMAND_TYPES.INFO) {
    let txCount;
    if (normalizedContent) {
      const parsed = parsers.parseDeviceInfo(normalizedContent);
      const deviceInfo = sanitizeDeviceInfoFromCmd(parsed);
      txCount = deviceInfo.transactionCount;
      if (Object.keys(deviceInfo).length > 0) {
        await queries.updateDeviceInfo(sn, deviceInfo);
      }
    }

    if (cmdParams.autoClearConfirm === true) {
      logger.info('Auto-clear log confirmation received', { sn, id, transactionCount: txCount });
    } else if (
      config.AUTO_CLEAR_LOG?.ENABLED &&
      cmdParams.autoClearCheck === true &&
      Number.isFinite(txCount) &&
      txCount > config.AUTO_CLEAR_LOG.THRESHOLD
    ) {
      const verified = await queries.getDeviceVerificationStatus(sn);
      const alreadyPending = await queries.hasPendingCommand(sn, config.COMMAND_TYPES.CLEAR_LOG);
      if (verified && !alreadyPending) {
        await queueCommand(sn, config.COMMAND_TYPES.CLEAR_LOG, {
          autoClear: true,
          triggeredByCommandId: id,
          transactionCount: txCount
        });
        logger.info('Auto-clear log queued because transactionCount exceeded threshold', {
          sn,
          id,
          transactionCount: txCount,
          threshold: config.AUTO_CLEAR_LOG.THRESHOLD
        });
      }
    }
  } else if (command.command_type === config.COMMAND_TYPES.CLEAR_LOG) {
    const alreadyPendingInfo = await queries.hasPendingCommand(sn, config.COMMAND_TYPES.INFO);
    if (!alreadyPendingInfo) {
      await queueCommand(sn, config.COMMAND_TYPES.INFO, {
        autoClearConfirm: true,
        triggeredByClearCommandId: id
      });
      logger.info('Confirmation INFO command queued after CLEAR_LOG', { sn, id });
    }
  } else if (command.command_type === config.COMMAND_TYPES.DELETE_USER) {
    const pin = String(cmdParams.pin);

    // 1. Soft delete the mapping
    await queries.softDeletePegawaiDeviceMapping(pin, sn);
    logger.info('Soft-deleted pegawai device mapping', { pin, sn });

    // 2. Delete the biometrics on this device
    await queries.deletePegawaiFingerprints(pin, sn);
    await queries.deletePegawaiFaces(pin, sn);
    logger.info('Deleted fingerprints and faces for pegawai on device', { pin, sn });

    // 3. If the pegawai is no longer mapped to any active devices, soft-delete them globally
    const activeCount = await queries.countActiveDeviceMappings(pin);
    if (activeCount === 0) {
      await queries.softDeletePegawai(pin);
      logger.info('Pegawai has no remaining active mappings. Soft-deleted pegawai globally.', { pin });
    }
  } else if (
    command.command_type === config.COMMAND_TYPES.DATA_USER ||
    command.command_type === config.COMMAND_TYPES.DATA_FP ||
    command.command_type === config.COMMAND_TYPES.DATA_FACE
  ) {
    await syncBiometricCommandToDb(sn, id, command.command_type, cmdParams);
  }

  // Mark command as success only after DB side-effects succeed so failures remain retryable
  await queries.updateCommandStatus(id, 'success', returnValue, normalizedContent);
  logger.info('Command execution status updated', { sn, id, type: command.command_type, status: 'success', returnValue });
};

module.exports = {
  MAX_SHELL_CMD_LENGTH,
  normalizeServerUrl,
  queueCommand,
  getAndExecuteNext,
  getQueueStatus,
  getQueueCount,
  buildShellStagingCommand,
  buildCommandString,
  processCommandResult,
};
