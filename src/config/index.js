'use strict';

const constants = require('./constants');

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.ADMIN_API_KEY,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

  // Export constants
  ...constants,

  // App specific config
  APP: {
    NAME: 'DBSPOT',
    VERSION: '1.5'
  },

  // Server config
  SERVER: {
    HOST: '0.0.0.0',
    CORS_ORIGIN: '*'
  },

  // Database config
  DATABASE: {
    MAX_CONNECTIONS: 20,
    IDLE_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 2000
  },

  // Request config
  REQUEST: {
    RAW_BODY_LIMIT: '10mb',
    RAW_BODY_ENCODING: 'utf8'
  }
};
