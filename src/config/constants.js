'use strict';

// Path constants
module.exports = {
  PATHS: {
    ROOT: '/',
    ICLOCK: {
      CDATA: '/iclock/cdata',
      GETREQUEST: '/iclock/getrequest',
      DEVICECMD: '/iclock/devicecmd'
    },
    ADMIN: {
      REUPLOAD: '/admin/reupload/:sn',
      CLEAR_LOG: '/admin/clearlog/:sn',
      INFO: '/admin/info/:sn',
      REBOOT: '/admin/reboot/:sn',
      USERINFO: '/admin/userinfo/:sn',
      USERINFO_DELETE: '/admin/userinfo/:sn/:pin',
      COMMAND_QUEUE: '/admin/commands/queue'
    }
  },

  // Device constants
  DEVICE: {
    DEFAULT_TIMEZONE: '+07:00',
    DEFAULT_STATUS: 'online',
    STATUS: {
      ONLINE: 'online',
      OFFLINE: 'offline'
    }
  },

  // Response messages
  RESPONSE: {
    OK: 'OK',
    ERROR: {
      MISSING_SN: 'Missing SN',
      INVALID_REQUEST: 'Invalid request: Missing SN',
      DEVICE_NOT_VERIFIED: 'ERROR: Device not verified',
      INTERNAL_SERVER_ERROR: 'Internal Server Error'
    },
    ADMIN: {
      REUPLOAD_QUEUED: 'Reupload queued for device',
      DEVICE_NOT_FOUND: 'Device not found',
      UNAUTHORIZED: 'Unauthorized: Invalid API Key',
      COMMAND_QUEUED: 'Command queued for device',
      MISSING_PIN: 'Missing required parameter: pin',
      MISSING_PRIVILEGE: 'Missing required parameter: privilege'
    }
  },

  // Device commands
  COMMANDS: {
    CHECK: 'C:10:CHECK',
    CLEAR_LOG: 'C:10:CLEAR LOG',
    INFO: 'C:10:INFO',
    REBOOT: 'C:10:REBOOT',
    UPDATE_USERINFO: 'C:10:UPDATE USERINFO',
    DELETE_USERINFO: 'C:10:DELETE USERINFO'
  },

  // Command types for database
  COMMAND_TYPES: {
    CHECK: 'CHECK',
    CLEAR_LOG: 'CLEAR_LOG',
    INFO: 'INFO',
    REBOOT: 'REBOOT',
    UPDATE_USERINFO: 'UPDATE_USERINFO',
    DELETE_USERINFO: 'DELETE_USERINFO'
  },

  // Command status
  COMMAND_STATUS: {
    PENDING: 'pending',
    EXECUTED: 'executed'
  },

  // Table names
  TABLES: {
    ATTLOG: 'ATTLOG'
  },

  // Time constants
  TIME: {
    VERIFIED_OFFSET_HOURS: parseInt(process.env.VERIFIED_OFFSET_HOURS) || 5
  }
};

