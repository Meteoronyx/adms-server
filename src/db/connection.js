'use strict';

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE.MAX_CONNECTIONS,
  idleTimeoutMillis: config.DATABASE.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: config.DATABASE.CONNECTION_TIMEOUT_MS,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
