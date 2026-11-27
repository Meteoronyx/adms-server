'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
const queries = require('../src/db/queries');
const commandService = require('../src/services/commandService');
const reuploadService = require('../src/services/reuploadService');
const attendanceService = require('../src/services/attendanceService');

const stubQueries = (overrides) => {
  const originals = {};
  for (const [key, fn] of Object.entries(overrides)) {
    originals[key] = queries[key];
    queries[key] = fn;
  }
  return () => {
    for (const [key, fn] of Object.entries(originals)) {
      queries[key] = fn;
    }
  };
};

test('commandService.processCommandResult auto-syncs DATA_USER on returnValue === 0', async () => {
  const calls = [];
  const restore = stubQueries({
    getCommandById: async (id) => ({
      id,
      command_type: config.COMMAND_TYPES.DATA_USER,
      status: 'executed',
      command_params: { pin: '101', name: 'Budi', privilege: 14, passwd: '123' }
    }),
    updateCommandStatus: async (...args) => { calls.push(['updateCommandStatus', args]); },
    ensurePegawaiBasicInfo: async (...args) => { calls.push(['ensurePegawaiBasicInfo', args]); },
    getDeviceInfo: async (sn) => ({ sn, device_name: 'Mesin B' }),
    upsertPegawaiDeviceMapping: async (...args) => { calls.push(['upsertPegawaiDeviceMapping', args]); }
  });

  try {
    await commandService.processCommandResult('SN-B', 501, 0);
    assert.deepEqual(calls[0], ['ensurePegawaiBasicInfo', ['101', 'Budi']]);
    assert.deepEqual(calls[1], ['upsertPegawaiDeviceMapping', ['101', 'SN-B', 'Mesin B', 14, '123']]);
    assert.deepEqual(calls[2], ['updateCommandStatus', [501, 'success', 0, null]]);
  } finally {
    restore();
  }
});

test('commandService.processCommandResult auto-syncs DATA_FP on returnValue === 0', async () => {
  const calls = [];
  const restore = stubQueries({
    getCommandById: async (id) => ({
      id,
      command_type: config.COMMAND_TYPES.DATA_FP,
      status: 'executed',
      command_params: {
        pin: '101',
        finger_id: 6,
        template: 'BASE64_FP_TMP',
        user_info: { name: 'Budi' }
      }
    }),
    updateCommandStatus: async (...args) => { calls.push(['updateCommandStatus', args]); },
    ensurePegawaiBasicInfo: async (...args) => { calls.push(['ensurePegawaiBasicInfo', args]); },
    ensurePegawaiDeviceMapping: async (...args) => { calls.push(['ensurePegawaiDeviceMapping', args]); },
    upsertFingerprint: async (...args) => { calls.push(['upsertFingerprint', args]); }
  });

  try {
    await commandService.processCommandResult('SN-B', 502, 0);
    assert.deepEqual(calls[0], ['ensurePegawaiBasicInfo', ['101', 'Budi']]);
    assert.deepEqual(calls[1], ['ensurePegawaiDeviceMapping', ['101', 'SN-B']]);
    assert.deepEqual(calls[2], ['upsertFingerprint', ['101', 'SN-B', 6, 'BASE64_FP_TMP']]);
    assert.deepEqual(calls[3], ['updateCommandStatus', [502, 'success', 0, null]]);
  } finally {
    restore();
  }
});

test('commandService.processCommandResult does NOT mark DATA_FP success when upsertFingerprint fails', async () => {
  let statusUpdated = false;
  const restore = stubQueries({
    getCommandById: async (id) => ({
      id,
      command_type: config.COMMAND_TYPES.DATA_FP,
      status: 'executed',
      command_params: {
        pin: '101',
        finger_id: 6,
        template: 'BASE64_FP_TMP'
      }
    }),
    ensurePegawaiDeviceMapping: async () => {},
    upsertFingerprint: async () => { throw new Error('DB connection lost'); },
    updateCommandStatus: async () => { statusUpdated = true; }
  });

  try {
    await assert.rejects(
      () => commandService.processCommandResult('SN-B', 505, 0),
      /DB connection lost/
    );
    assert.equal(statusUpdated, false);
  } finally {
    restore();
  }
});

test('commandService.processCommandResult auto-syncs DATA_FACE on returnValue === 0', async () => {
  const calls = [];
  const restore = stubQueries({
    getCommandById: async (id) => ({
      id,
      command_type: config.COMMAND_TYPES.DATA_FACE,
      status: 'executed',
      command_params: {
        pin: '101',
        face_id: 0,
        size: 1214,
        valid: 1,
        template: 'BASE64_FACE_TMP'
      }
    }),
    updateCommandStatus: async (...args) => { calls.push(['updateCommandStatus', args]); },
    ensurePegawaiDeviceMapping: async (...args) => { calls.push(['ensurePegawaiDeviceMapping', args]); },
    upsertFace: async (...args) => { calls.push(['upsertFace', args]); }
  });

  try {
    await commandService.processCommandResult('SN-B', 503, 0);
    assert.deepEqual(calls[0], ['ensurePegawaiDeviceMapping', ['101', 'SN-B']]);
    assert.deepEqual(calls[1], ['upsertFace', ['101', 'SN-B', 0, 1214, 1, 'BASE64_FACE_TMP']]);
    assert.deepEqual(calls[2], ['updateCommandStatus', [503, 'success', 0, null]]);
  } finally {
    restore();
  }
});

test('commandService.processCommandResult does NOT upsert on failed returnValue', async () => {
  let upserted = false;
  const restore = stubQueries({
    getCommandById: async (id) => ({
      id,
      command_type: config.COMMAND_TYPES.DATA_USER,
      status: 'executed',
      command_params: { pin: '101', name: 'Budi' }
    }),
    updateCommandStatus: async () => {},
    ensurePegawaiBasicInfo: async () => { upserted = true; },
    upsertPegawaiDeviceMapping: async () => { upserted = true; }
  });

  try {
    await commandService.processCommandResult('SN-B', 504, -1);
    assert.equal(upserted, false);
  } finally {
    restore();
  }
});

test('reuploadService tracks users_only and full modes across dual handshakes until cleared', () => {
  reuploadService.addToQueue('SN-TEST-1', 'users_only');
  assert.equal(reuploadService.isInQueue('SN-TEST-1'), true);

  const status = reuploadService.getQueueStatus();
  assert.equal(status['SN-TEST-1'].mode, 'users_only');

  const popped = reuploadService.checkAndRemove('SN-TEST-1');
  assert.equal(popped.mode, 'users_only');
  assert.equal(reuploadService.isInQueue('SN-TEST-1'), false);

  assert.equal(reuploadService.getHandshakeMode('SN-TEST-1'), 'users_only');
  assert.equal(reuploadService.getHandshakeMode('SN-TEST-1'), 'users_only');
  reuploadService.clearHandshakeMode('SN-TEST-1');
  assert.equal(reuploadService.getHandshakeMode('SN-TEST-1'), null);

  reuploadService.addToQueue('SN-TEST-2', 'full');
  const poppedFull = reuploadService.checkAndRemove('SN-TEST-2');
  assert.equal(poppedFull.mode, 'full');
  assert.equal(reuploadService.getHandshakeMode('SN-TEST-2'), 'full');
  reuploadService.clearHandshakeMode('SN-TEST-2');
});

test('attendanceService.getHandshakeResponse uses last_attlog_stamp in usersOnly mode and Stamp=0 by default', async () => {
  let mockStamp = 1795496400;
  const restore = stubQueries({
    getDeviceVerificationStatus: async () => true,
    getDeviceAttlogStamp: async () => mockStamp
  });

  try {
    const defaultResp = await attendanceService.getHandshakeResponse('SN-TEST');
    assert.match(defaultResp, /\nStamp=0\n/);
    assert.match(defaultResp, /\nOpStamp=0\n/);
    assert.match(defaultResp, /\nTransFlag=110111111111\n/);
    assert.match(defaultResp, /\nATTLOGStamp=0$/);

    const usersOnlyResp = await attendanceService.getHandshakeResponse('SN-TEST', { usersOnly: true });
    assert.match(usersOnlyResp, /\nStamp=1795496400\n/);
    assert.match(usersOnlyResp, /\nOpStamp=0\n/);
    assert.match(usersOnlyResp, /\nATTLOGStamp=1795496400$/);

    mockStamp = null;
    const fallbackResp = await attendanceService.getHandshakeResponse('SN-TEST', { usersOnly: true });
    const stampMatch = fallbackResp.match(/\nStamp=(\d+)\n/);
    assert.ok(stampMatch);
    assert.ok(Number(stampMatch[1]) > 0);
    assert.match(fallbackResp, /\nOpStamp=0\n/);
  } finally {
    restore();
  }
});
