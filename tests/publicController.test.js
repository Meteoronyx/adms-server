'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const publicController = require('../src/controllers/publicController');
const queries = require('../src/db/queries');

test('getPublicDeviceStatus sanitizes sensitive data and calculates summary correctly', async (t) => {
  // Mock queries.getPublicDevicesStatus
  const originalQuery = queries.getPublicDevicesStatus;
  queries.getPublicDevicesStatus = async () => [
    {
      sn: 'BJF4230001',
      name: 'Fingerprint Lobi',
      device_name: 'Mesin Lobi BKD',
      last_activity: '2026-11-04T12:00:00Z',
      status: 'online',
      nama_opd: 'Badan Kepegawaian Daerah',
      parent_nama_opd: null,
      // Even if raw DB query had extra columns, ensure controller strips them
      ip_address: '192.168.1.100',
      kdunker: '123400000000000',
    },
    {
      sn: 'ABC12345',
      name: 'Mesin Aula',
      device_name: null,
      last_activity: '2026-11-01T08:00:00Z',
      status: 'offline',
      nama_opd: 'Dinas Pendidikan',
      parent_nama_opd: null,
      ip_address: '10.0.0.5',
    },
  ];

  t.after(() => {
    queries.getPublicDevicesStatus = originalQuery;
  });

  const headers = {};
  const req = { ip: '127.0.0.1' };
  let jsonResult = null;
  const res = {
    set(key, val) {
      headers[key] = val;
      return this;
    },
    json(payload) {
      jsonResult = payload;
      return this;
    },
  };

  await publicController.getPublicDeviceStatus(req, res);

  assert.ok(jsonResult, 'Response should not be null');
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.summary.total, 2);
  assert.equal(jsonResult.summary.online, 1);
  assert.equal(jsonResult.summary.offline, 1);
  assert.equal(jsonResult.devices.length, 2);

  // Check device 1
  const dev1 = jsonResult.devices[0];
  assert.equal(dev1.name, 'Mesin Lobi BKD');
  assert.equal(dev1.masked_sn, 'BJF4****001');
  assert.equal(dev1.opd, 'Badan Kepegawaian Daerah');
  assert.equal(dev1.status, 'online');
  assert.equal(dev1.ip_address, undefined, 'ip_address must NOT be exposed');
  assert.equal(dev1.kdunker, undefined, 'kdunker must NOT be exposed');

  // Check device 2
  const dev2 = jsonResult.devices[1];
  assert.equal(dev2.name, 'Mesin Aula');
  assert.equal(dev2.masked_sn, 'ABC1****345');
  assert.equal(dev2.status, 'offline');
  assert.equal(dev2.ip_address, undefined, 'ip_address must NOT be exposed');

  // Test caching (subsequent immediate call)
  const headers2 = {};
  const res2 = {
    set(key, val) {
      headers2[key] = val;
      return this;
    },
    json(payload) {
      return this;
    },
  };
  await publicController.getPublicDeviceStatus(req, res2);
  assert.equal(headers2['X-Cache'], 'HIT', 'Immediate subsequent call should hit cache');
});
