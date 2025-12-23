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
      USER: '/admin/user/:sn',
      USER_DELETE: '/admin/user/:sn/:pin',
      ENROLL_FP: '/admin/enrollfp/:sn',
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
    UPDATE_USER: 'C:10:DATA USER',
    DELETE_USER: 'C:10:DATA DEL_USER',
    ENROLL_FP: 'C:10:ENROLL_FP'
  },

  // Command types for database
  COMMAND_TYPES: {
    CHECK: 'CHECK',
    CLEAR_LOG: 'CLEAR_LOG',
    INFO: 'INFO',
    REBOOT: 'REBOOT',
    UPDATE_USER: 'UPDATE_USER',
    DELETE_USER: 'DELETE_USER',
    ENROLL_FP: 'ENROLL_FP'
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
    UNVERIFIED_OFFSET_HOURS: parseInt(process.env.UNVERIFIED_OFFSET_HOURS) || 1,
    UNVERIFIED_TIMEZONE: '+08:00'
  }
};
