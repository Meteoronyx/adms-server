'use strict';

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE.MAX_CONNECTIONS,
  idleTimeoutMillis: config.DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: config.DATABASE.CONNECTION_TIMEOUT_MS,
});

// Test connection on startup
pool.on('connect', () => {
  logger.info('Database pool connected');
});

pool.on('error', (err) => {
  logger.error('Database pool unexpected error', {
    message: err.message,
    stack: err.stack
  });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
