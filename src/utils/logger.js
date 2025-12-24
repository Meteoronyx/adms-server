'use strict';

const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { NODE_ENV } = require('../config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
});

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dbspot-adms' },
  transports: [
    ...(NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          customFormat
        )
      })
    ] : []),
    // Error logs - critical only
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Combined logs - all levels
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 52428800, // 50MB
      maxFiles: 3,
      tailable: true
    }),
    // Application logs - info and above
    new winston.transports.File({ 
      filename: 'logs/app.log',
      level: 'info',
      maxsize: 52428800, // 50MB
      maxFiles: 3,
      tailable: true
    })
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Add stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
