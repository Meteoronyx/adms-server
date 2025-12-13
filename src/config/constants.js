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
      REUPLOAD: '/admin/reupload/:sn'
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
      UNAUTHORIZED: 'Unauthorized: Invalid API Key'
    }
  },

  // Device commands
  COMMANDS: {
    CHECK: 'C:10:CHECK'
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
