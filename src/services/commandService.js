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
      // Format: C:10:UPDATE USER PIN=1\tPri=0\tPasswd=0
      const { pin, privilege, passwd = 0 } = command_params;
      return `${config.COMMANDS.UPDATE_USER} PIN=${pin}\tPri=${privilege}\tPasswd=${passwd}`;
      
      case config.COMMAND_TYPES.DELETE_USER:
      // Format: C:10:DATA DEL_USER PIN=1
      return `${config.COMMANDS.DELETE_USER} PIN=${command_params.pin}`;
      
    case config.COMMAND_TYPES.ENROLL_FP:
      // Format: C:10:ENROLL_FP PIN=8888\tFID=0\tRETRY=3\tOVERWRITE=0
      const { pin: fpPin, fid, retry = 3, overwrite = 0 } = command_params;
      return `${config.COMMANDS.ENROLL_FP} PIN=${fpPin}\tFID=${fid}\tRETRY=${retry}\tOVERWRITE=${overwrite}`;
      
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
