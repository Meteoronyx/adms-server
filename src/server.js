'use strict';

require('dotenv/config');

const express = require('express');
const cors = require('cors');
const getRawBody = require('raw-body');
const handlers = require('./handlers');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*'
}));

// Middleware untuk parse raw body text/plain
const rawBodyParser = async (req, res, next) => {
  if (req.method === 'POST' && req.is('text/plain')) {
    try {
      req.rawBody = await getRawBody(req, {
        length: req.headers['content-length'],
        limit: '10mb',
        encoding: 'utf8'
      });
      next();
    } catch (err) {
      res.status(400).send('Bad Request');
    }
  } else {
    next();
  }
};

app.get('/', (req, res) => {
  res.send('ADMS Server Ready');
});

// GET /iclock/cdata - Handshake & Time sync
app.get('/iclock/cdata', async (req, res) => {
  const { SN, type } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    res.status(400).send('Missing SN');
    return;
  }

  try {
    const response = await handlers.handleCdataGet(SN, ip, type);
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /iclock/cdata - Attendance logs
app.post('/iclock/cdata', rawBodyParser, async (req, res) => {
  const { SN, table } = req.query;

  if (!SN || table !== 'ATTLOG') {
    res.status(400).send('Invalid request: Missing SN or table=ATTLOG');
    return;
  }

  try {
    const response = await handlers.handleCdataPost(SN, req.rawBody);
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// GET /iclock/getrequest - Heartbeat
app.get('/iclock/getrequest', async (req, res) => {
  const { SN, INFO } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    res.status(400).send('Missing SN');
    return;
  }

  try {
    const response = await handlers.handleGetrequest(SN, ip, INFO);
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// POST /iclock/devicecmd - Device commands
app.post('/iclock/devicecmd', rawBodyParser, async (req, res) => {
  const { SN } = req.query;
  const ip = req.ip || 'unknown';

  if (!SN) {
    res.status(400).send('Missing SN');
    return;
  }

  try {
    const response = await handlers.handleDevicecmd(SN, ip, req.rawBody);
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ADMS Server running on http://0.0.0.0:${port}`);
});
