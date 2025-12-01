'use strict';

const { Pool } = require('pg');
require('dotenv/config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
