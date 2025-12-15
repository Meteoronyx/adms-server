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
      
    case config.COMMAND_TYPES.UPDATE_USERINFO:
      // Format: C:10:UPDATE USERINFO PIN=1\tPri=0
      const { pin, privilege } = command_params;
      return `${config.COMMANDS.UPDATE_USERINFO} PIN=${pin}\tPri=${privilege}`;
      
    case config.COMMAND_TYPES.DELETE_USERINFO:
      // Format: C:10:DELETE USERINFO PIN=1
      return `${config.COMMANDS.DELETE_USERINFO} PIN=${command_params.pin}`;
      
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
