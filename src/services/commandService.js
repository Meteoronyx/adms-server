'use strict';

const queries = require('../db/queries');
const config = require('../config');
const logger = require('../utils/logger');

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

    default:
      return null;
  }
};

const queueCommand = async (sn, commandType, params = {}) => {
  return queries.insertCommand(sn, commandType, params);
};

const getAndExecuteNext = async (sn) => {
  const command = await queries.getNextPendingCommand(sn);

  if (!command) {
    return null;
  }

  const commandString = buildCommandString(command);

  if (commandString) {
    await queries.markCommandExecuted(command.id);
    return {
      id: command.id,
      type: command.command_type,
      commandString
    };
  }

  return null;
};

const getQueueStatus = async (opdId = null) => {
  return queries.getAllPendingCommands(opdId);
};

const processCommandResult = async (sn, id, returnValue) => {
  const command = await queries.getCommandById(id);
  if (!command) {
    logger.warn('Received command result for unknown command ID', { sn, id, returnValue });
    return;
  }

  // Update status based on execution return code
  const status = returnValue === 0 ? 'success' : 'failed';
  await queries.updateCommandStatus(id, status);
  logger.info('Command execution status updated', { sn, id, type: command.command_type, status, returnValue });

  if (returnValue === 0) {
    if (command.command_type === config.COMMAND_TYPES.DELETE_USER) {
      const pin = String(command.command_params.pin);

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
    }
  }
};

module.exports = {
  queueCommand,
  getAndExecuteNext,
  getQueueStatus,
  buildCommandString,
  processCommandResult,
};
