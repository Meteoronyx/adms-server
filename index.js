require('dotenv/config');

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const rawBody = require('raw-body');

const prisma = new PrismaClient();

const app = express();
const port = 3000;

app.use(cors({
  origin: '*'
}));

app.get('/', (req, res) => {
  res.send('ADMS Server Ready');
});

app.get('/iclock/cdata', async (req, res) => {
  const { SN, type } = req.query;

  if (type === 'time') {
    res.set('Content-Type', 'text/plain');
    res.send(`Time=${new Date().toISOString().slice(0, 19)}`);
    return;
  }

  if (!SN) {
    res.status(400).set('Content-Type', 'text/plain');
    res.send('Missing SN');
    return;
  }

  const ip = req.ip || req.connection.remoteAddress;
  const timezone = '+07:00'; // Server timezone (Asia/Jakarta)

  try {
    await prisma.device.upsert({
      where: { sn: SN },
      update: {
        ipAddress: ip,
        status: 'online',
        timezone,
      },
      create: {
        sn: SN,
        ipAddress: ip,
        status: 'online',
        timezone,
      },
    });
  } catch (error) {
    console.error('DB error:', error);
    // Continue without DB for now
  }

  res.set('Content-Type', 'text/plain');
  res.send(`GET OPTION FROM: ${SN}
Stamp=9999
OpStamp=9999
PhotoStamp=9999
ErrorDelay=30
Delay=30
TransTimes=00:00;14:05
TransInterval=1
TransFlag=1111000000
Realtime=1
Encrypt=0
TimeZone=${timezone}
ServerVer=3.4.1 2018-06-30
ATTLOGStamp=0
`);
});

// Raw body middleware for ATTLOG POST
const parseRawBody = (req, res, next) => {
  rawBody(req, {
    limit: '10mb',
    length: req.headers['content-length']
  }).then((buf) => {
    req.rawBody = buf.toString('utf8');
    next();
  }).catch((err) => {
    res.status(400).send('Invalid body');
  });
};

app.post('/iclock/cdata', parseRawBody, async (req, res) => {
  const { SN, table } = req.query;

  if (!SN || table !== 'ATTLOG') {
    res.status(400).set('Content-Type', 'text/plain');
    res.send('Invalid SN or table');
    return;
  }

  const ip = req.ip || req.connection.remoteAddress;

  try {
    // Upsert device
    await prisma.device.upsert({
      where: { sn: SN },
      update: {
        ipAddress: ip,
        status: 'online',
      },
      create: {
        sn: SN,
        ipAddress: ip,
        status: 'online',
      },
    });

    // Parse ATTLOG lines
    const lines = req.rawBody.trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      const fields = line.split('\t');
      if (fields.length < 4) continue; // Min: PIN, Time, Status, VerifyMode

      const [userPin, checkTimeStr, statusStr, verifyModeStr, validationStr = '0', workCodeStr = '0'] = fields;

      const checkTime = new Date(checkTimeStr.replace(' ', 'T'));
      const status = parseInt(statusStr, 10);
      const verifyMode = parseInt(verifyModeStr, 10);
      const validation = parseInt(validationStr, 10);
      const workCode = parseInt(workCodeStr, 10);

      // Upsert log (unique constraint handles dupes)
      await prisma.attendanceLog.upsert({
        where: {
          deviceSn_userPin_checkTime: {
            deviceSn: SN,
            userPin,
            checkTime,
          },
        },
        update: {
          status,
          verifyMode,
          rawData: line,
        },
        create: {
          deviceSn: SN,
          userPin,
          checkTime,
          status,
          verifyMode,
          rawData: line,
        },
      });
    }
  } catch (error) {
    console.error('ATTLOG error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('OK'); // Still OK to prevent retries
    return;
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK');
});

// Heartbeat
app.get('/iclock/getrequest', async (req, res) => {
  const { SN } = req.query;

  if (!SN) {
    res.status(400).set('Content-Type', 'text/plain');
    res.send('Missing SN');
    return;
  }

  const ip = req.ip || req.connection.remoteAddress;

  try {
    await prisma.device.upsert({
      where: { sn: SN },
      update: {
        ipAddress: ip,
        status: 'online',
      },
      create: {
        sn: SN,
        ipAddress: ip,
        status: 'online',
      },
    });
  } catch (error) {
    console.error('Heartbeat DB error:', error);
  }

  res.set('Content-Type', 'text/plain');
  res.send('OK');
});

app.listen(port, "0.0.0.0", () => {
  console.log(`ADMS Server running on http://0.0.0.0:${port}`);
});
