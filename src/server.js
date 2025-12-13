'use strict';

require('dotenv/config');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const config = require('./config');
const iclockRoutes = require('./routes/iclock');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('trust proxy', 1);

const port = config.PORT;

// Middleware
app.use(cors({
  origin: config.SERVER.CORS_ORIGIN
}));

app.use(morgan(
  config.NODE_ENV === 'production' ? 'combined' : 'dev',
  { skip: (req, res) => res.statusCode < 400 }
));

// JSON body parser for admin routes
app.use(express.json());

// Routes
app.get(config.PATHS.ROOT, (req, res) => {
  res.send(`${config.APP.NAME} Ready`);
});

app.use(iclockRoutes);
app.use(adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    message: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip 
  });
  res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, config.SERVER.HOST, () => {
  logger.info(`${config.APP.NAME} v${config.APP.VERSION} running on http://${config.SERVER.HOST}:${port}`);
});
