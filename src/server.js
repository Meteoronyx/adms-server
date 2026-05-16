'use strict';

require('dotenv/config');

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const morgan = require('morgan');
const logger = require('./utils/logger');
const config = require('./config');
const iclockRoutes = require('./routes/iclock');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const { getDatabaseStatus } = require('./db/connection');

const app = express();

app.set('trust proxy', 1);

const port = config.PORT;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

// Morgan HTTP logger
app.use(morgan('combined', {
  stream: logger.stream,
  skip: (req) => req.url.includes('/iclock/getrequest')
}));

// JSON body parser for admin routes
app.use(express.json());
app.use(cookieParser());

// Serve frontend static files
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

app.use(authRoutes);
app.use(iclockRoutes);
app.use(adminRoutes);

const formatUptime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    const dbStatus = await getDatabaseStatus();
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: formatUptime(uptime),
      database: dbStatus,
      memory: {
        used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
      },
      node_version: process.version,
      app_version: `${config.APP.NAME} v${config.APP.VERSION}`
    };

    // Log health check access occasionally (not every time to avoid flooding)
    if (Math.random() < 0.05) { // 5% chance to log
      logger.debug('Health check accessed', healthData);
    }

    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', `${responseTime}ms`);
    res.json(healthData);
  } catch (err) {
    const responseTime = Date.now() - startTime;
    logger.error('Health check failed', {
      error: err.message,
      stack: err.stack,
      response_time: `${responseTime}ms`
    });
    res.set('X-Response-Time', `${responseTime}ms`);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

app.get('*', (req, res, next) => {
  if (req.url.startsWith('/iclock') || req.url.startsWith('/admin') || req.url.startsWith('/api') || req.url.startsWith('/socket.io') || !req.accepts('html')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

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

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.warn(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message, stack: err.stack });
      process.exit(1);
    }

    logger.info('Server closed successfully');
    logger.info('Shutdown complete', {
      uptime: formatUptime(process.uptime())
    });

    // Close database connections
    const { pool } = require('./db/connection');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    message: err.message,
    stack: err.stack
  });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
});

const server = app.listen(port, config.SERVER.HOST, () => {
  const memInfo = process.memoryUsage();
  logger.info(`${config.APP.NAME} v${config.APP.VERSION} started successfully`, {
    url: `http://${config.SERVER.HOST}:${port}`,
    environment: config.NODE_ENV,
    node_version: process.version,
    memory: {
      heap_used: `${Math.round(memInfo.heapUsed / 1024 / 1024)}MB`,
      heap_total: `${Math.round(memInfo.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memInfo.rss / 1024 / 1024)}MB`
    },
    database: config.DATABASE_URL ? 'configured' : 'not configured'
  });

  logger.info('Ready to accept attendance data from devices');
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Attach cookieParser to Socket.IO handshake
io.use((socket, next) => {
  cookieParser()(socket.request, {}, next);
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);
