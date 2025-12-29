'use strict';

const queries = require('../db/queries');
const config = require('../config');

const buildCommandString = (command) => {
  const { command_type, command_params } = command;
  
  switch (command_type) {
    case config.COMMAND_TYPES.CLEAR_LOG:
      return config.COMMANDS.CLEAR_LOG;
      
    case config.COMMAND_TYPES.INFO:
      return config.COMMANDS.INFO;
      
    case config.COMMAND_TYPES.REBOOT:
      return config.COMMANDS.REBOOT;
      
    case config.COMMAND_TYPES.UPDATE_USER:
      // Format: C:10:UPDATE USER PIN=1\tPri=0 (passwd: 0 → hapus password, passwd: 123 → set password)
      const { pin, privilege, passwd } = command_params;
      let cmd = `${config.COMMANDS.UPDATE_USER} PIN=${pin}\tPri=${privilege}`;
      if (passwd !== undefined && passwd !== null) {
        if (passwd === 0) {
          cmd += `\tPasswd=`;
        } else {
          cmd += `\tPasswd=${passwd}`;
        }
      }
      return cmd;
      
      case config.COMMAND_TYPES.DELETE_USER:
      // Format: C:10:DATA DEL_USER PIN=1
      return `${config.COMMANDS.DELETE_USER} PIN=${command_params.pin}`;
      
    case config.COMMAND_TYPES.ENROLL_FP:
      // Format: C:10:ENROLL_FP PIN=8888\tFID=0\tRETRY=3\tOVERWRITE=0
      const { pin: fpPin, fid, retry = 3, overwrite = 0 } = command_params;
      return `${config.COMMANDS.ENROLL_FP} PIN=${fpPin}\tFID=${fid}\tRETRY=${retry}\tOVERWRITE=${overwrite}`;
      
    case config.COMMAND_TYPES.DATA_FP:
      // Format: C:10:DATA FP PIN=xxx\tFID=x\tSize=x\tValid=1\tTMP=base64
      const { pin: dataFpPin, finger_id, template } = command_params;
      const size = template ? template.length : 0;
      return `${config.COMMANDS.DATA_FP} PIN=${dataFpPin}\tFID=${finger_id}\tSize=${size}\tValid=1\tTMP=${template}`;
      
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

const getQueueStatus = async () => {
  return queries.getAllPendingCommands();
};

module.exports = {
  queueCommand,
  getAndExecuteNext,
  getQueueStatus,
  buildCommandString
};
