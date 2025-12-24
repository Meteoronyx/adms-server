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

// Track connection pool health
let lastConnectTime = null;

// Test connection on startup
pool.on('connect', () => {
  lastConnectTime = new Date();
  logger.info('Database pool connected');
});

pool.on('error', (err) => {
  logger.error('Database pool unexpected error', {
    message: err.message,
    stack: err.stack
  });
});

// Function to get database status for health check
const getDatabaseStatus = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;
    
    const status = {
      status: 'connected',
      current_time: result.rows[0].current_time,
      last_connection: lastConnectTime,
      pool: {
        total: totalCount,
        idle: idleCount,
        active: totalCount - idleCount,
        waiting: waitingCount,
        max: config.DATABASE.MAX_CONNECTIONS,
        usage_percent: Math.round(((totalCount - idleCount) / config.DATABASE.MAX_CONNECTIONS) * 100)
      }
    };
    
    // Warning if pool usage is high
    if (status.pool.usage_percent > 80) {
      logger.warn('Database pool usage high', {
        usage: status.pool.usage_percent,
        active: status.pool.active,
        max: status.pool.max
      });
    }
    
    return status;
  } catch (err) {
    logger.error('Database health check failed', {
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getDatabaseStatus
};
