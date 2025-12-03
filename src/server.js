'use strict';

require('dotenv/config');

const express = require('express');
const cors = require('cors');
const config = require('./config');
const iclockRoutes = require('./routes/iclock');

const app = express();
const port = config.PORT;

// Middleware
app.use(cors({
  origin: config.SERVER.CORS_ORIGIN
}));

// Routes
app.get(config.PATHS.ROOT, (req, res) => {
  res.send(`${config.APP.NAME} Ready`);
});

// Mount iclock routes
app.use(iclockRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send(config.RESPONSE.ERROR.INTERNAL_SERVER_ERROR);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, config.SERVER.HOST, () => {
  console.log(`${config.APP.NAME} v${config.APP.VERSION} running on http://${config.SERVER.HOST}:${port}`);
});
