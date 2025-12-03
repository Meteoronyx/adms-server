'use strict';

const getRawBody = require('raw-body');
const config = require('../config');

// Middleware untuk parse raw body for device requests
const rawBodyParser = async (req, res, next) => {
  if (req.method === 'POST') {
    try {
      // Try to parse body regardless of content type
      req.rawBody = await getRawBody(req, {
        length: req.headers['content-length'],
        limit: config.REQUEST.RAW_BODY_LIMIT,
        encoding: config.REQUEST.RAW_BODY_ENCODING
      });
      next();
    } catch (err) {
      console.error('Error parsing raw body:', err.message);
      // If parsing fails, set rawBody to empty string to avoid undefined
      req.rawBody = '';
      next();
    }
  } else {
    next();
  }
};

module.exports = rawBodyParser;
