const http = require('http');
const https = require('https');

const SN = 'TEST_DEVICE_001';
const BASE_URL = 'http://localhost:3000';

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = (options.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response (${res.statusCode}): ${data}`);
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function main() {
  console.log('=== ADMS Client Simulator ===');

  // 1. Handshake GET
  console.log('\n1. Sending Handshake...');
  const handshakeUrl = `${BASE_URL}/iclock/cdata?SN=${SN}&options=all&pushver=3.2.0`;
  await request({
    method: 'GET',
    protocol: 'http:',
    hostname: 'localhost',
    port: 3000,
    path: handshakeUrl.slice(BASE_URL.length),
    headers: { 'User-Agent': 'ADMS/3.2.0' }
  });

  // 2. ATTLOG POST
  console.log('\n2. Sending ATTLOG...');
  const attlogBody = `101	2025-11-28 13:00:00	0	1	0	0
102	2025-11-28 13:05:00	0	1	0	0
101	2025-11-28 17:00:00	1	1	0	0
103	2025-11-28 17:05:00	1	15	0	0
104	2025-11-28 17:10:00	1	1	0	0
`;
  const attlogUrl = `${BASE_URL}/iclock/cdata?SN=${SN}&table=ATTLOG&Stamp=12345`;
  await request({
    method: 'POST',
    protocol: 'http:',
    hostname: 'localhost',
    port: 3000,
    path: attlogUrl.slice(BASE_URL.length),
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(attlogBody)
    }
  }, attlogBody);

  // 3. Heartbeat GET
  console.log('\n3. Sending Heartbeat...');
  const heartbeatUrl = `${BASE_URL}/iclock/getrequest?SN=${SN}`;
  await request({
    method: 'GET',
    protocol: 'http:',
    hostname: 'localhost',
    port: 3000,
    path: heartbeatUrl.slice(BASE_URL.length),
    headers: { 'User-Agent': 'ADMS/3.2.0' }
  });

  // 4. Time Sync
  console.log('\n4. Time Sync...');
  const timeUrl = `${BASE_URL}/iclock/cdata?SN=${SN}&type=time`;
  await request({
    method: 'GET',
    protocol: 'http:',
    hostname: 'localhost',
    port: 3000,
    path: timeUrl.slice(BASE_URL.length),
    headers: { 'User-Agent': 'ADMS/3.2.0' }
  });

  console.log('\n=== Simulation Complete ===');
}

main().catch(console.error);
