'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
const queries = require('../src/db/queries');
const commandService = require('../src/services/commandService');
const autoClearScheduler = require('../src/services/autoClearScheduler');

const SAMPLE_X601_INFO = [
  '~DeviceName=X601',
  'MAC=00:17:61:11:d7:47',
  'TransactionCount=95000',
  '~MaxAttLogCount=10',
  'UserCount=1',
  '~MaxUserCount=100'
].join('\n');

const stubQueries = (t, overrides = {}) => {
  const originals = {
    getCommandById: queries.getCommandById,
    updateCommandStatus: queries.updateCommandStatus,
    updateDeviceInfo: queries.updateDeviceInfo,
    getDeviceVerificationStatus: queries.getDeviceVerificationStatus,
    hasPendingCommand: queries.hasPendingCommand,
    insertCommand: queries.insertCommand,
    getVerifiedDeviceSns: queries.getVerifiedDeviceSns
  };

  Object.assign(queries, {
    updateCommandStatus: async () => {},
    updateDeviceInfo: async () => {},
    getDeviceVerificationStatus: async () => true,
    hasPendingCommand: async () => false,
    insertCommand: async (sn, type, params) => ({ id: 999, device_sn: sn, command_type: type, command_params: params }),
    getVerifiedDeviceSns: async () => [],
    ...overrides
  });

  t.after(() => {
    Object.assign(queries, originals);
  });
};

test('processCommandResult parses INFO payload and updates device transactionCount and userCount', async (t) => {
  const updatedInfos = [];
  stubQueries(t, {
    getCommandById: async () => ({
      id: 101,
      device_sn: 'SN-TEST-001',
      command_type: config.COMMAND_TYPES.INFO,
      command_params: {},
      status: 'executed'
    }),
    updateDeviceInfo: async (sn, info) => {
      updatedInfos.push({ sn, info });
    }
  });

  await commandService.processCommandResult('SN-TEST-001', 101, 0, SAMPLE_X601_INFO);

  assert.equal(updatedInfos.length, 1);
  assert.equal(updatedInfos[0].sn, 'SN-TEST-001');
  assert.equal(updatedInfos[0].info.deviceName, 'X601');
  assert.equal(updatedInfos[0].info.mac, '00:17:61:11:d7:47');
  assert.equal(updatedInfos[0].info.transactionCount, 95000);
  assert.equal(updatedInfos[0].info.userCount, 1);
});

test('processCommandResult queues CLEAR_LOG when autoClearCheck is true and transactionCount > 90000', async (t) => {
  const queued = [];
  stubQueries(t, {
    getCommandById: async () => ({
      id: 102,
      device_sn: 'SN-TEST-001',
      command_type: config.COMMAND_TYPES.INFO,
      command_params: { autoClearCheck: true },
      status: 'executed'
    }),
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
      return { id: 103 };
    }
  });

  await commandService.processCommandResult('SN-TEST-001', 102, 0, SAMPLE_X601_INFO);

  assert.equal(queued.length, 1);
  assert.equal(queued[0].sn, 'SN-TEST-001');
  assert.equal(queued[0].type, config.COMMAND_TYPES.CLEAR_LOG);
  assert.equal(queued[0].params.autoClear, true);
  assert.equal(queued[0].params.triggeredByCommandId, 102);
  assert.equal(queued[0].params.transactionCount, 95000);
});

test('processCommandResult does NOT queue CLEAR_LOG when transactionCount <= 90000', async (t) => {
  const queued = [];
  stubQueries(t, {
    getCommandById: async () => ({
      id: 104,
      device_sn: 'SN-TEST-001',
      command_type: config.COMMAND_TYPES.INFO,
      command_params: { autoClearCheck: true },
      status: 'executed'
    }),
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
    }
  });

  await commandService.processCommandResult(
    'SN-TEST-001',
    104,
    0,
    'TransactionCount=90000\nUserCount=1'
  );

  assert.equal(queued.length, 0);
});

test('processCommandResult does NOT queue CLEAR_LOG for manual INFO even if transactionCount > 90000', async (t) => {
  const queued = [];
  const updatedInfos = [];
  stubQueries(t, {
    getCommandById: async () => ({
      id: 105,
      device_sn: 'SN-TEST-001',
      command_type: config.COMMAND_TYPES.INFO,
      command_params: {},
      status: 'executed'
    }),
    updateDeviceInfo: async (sn, info) => {
      updatedInfos.push({ sn, info });
    },
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
    }
  });

  await commandService.processCommandResult('SN-TEST-001', 105, 0, SAMPLE_X601_INFO);

  assert.equal(updatedInfos.length, 1);
  assert.equal(updatedInfos[0].info.transactionCount, 95000);
  assert.equal(queued.length, 0);
});

test('processCommandResult is idempotent when firmware sends duplicate POST /iclock/devicecmd', async (t) => {
  let status = 'executed';
  const queued = [];
  const statusUpdates = [];
  stubQueries(t, {
    getCommandById: async () => ({
      id: 106,
      device_sn: 'SN-TEST-001',
      command_type: config.COMMAND_TYPES.INFO,
      command_params: { autoClearCheck: true },
      status
    }),
    updateCommandStatus: async (id, nextStatus) => {
      status = nextStatus;
      statusUpdates.push(nextStatus);
    },
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
    }
  });

  await commandService.processCommandResult('SN-TEST-001', 106, 0, SAMPLE_X601_INFO);
  await commandService.processCommandResult('SN-TEST-001', 106, 0, SAMPLE_X601_INFO);

  assert.equal(statusUpdates.length, 1);
  assert.equal(queued.length, 1);
});

test('processCommandResult queues confirmation INFO after CLEAR_LOG succeeds unless already pending', async (t) => {
  const queued = [];
  let hasPendingInfo = false;
  stubQueries(t, {
    getCommandById: async () => ({
      id: 201,
      device_sn: 'SN-TEST-001',
      command_type: config.COMMAND_TYPES.CLEAR_LOG,
      command_params: { autoClear: true },
      status: 'executed'
    }),
    hasPendingCommand: async (sn, type) => (type === config.COMMAND_TYPES.INFO ? hasPendingInfo : false),
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
    }
  });

  await commandService.processCommandResult('SN-TEST-001', 201, 0, null);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].type, config.COMMAND_TYPES.INFO);
  assert.equal(queued[0].params.autoClearConfirm, true);
  assert.equal(queued[0].params.triggeredByClearCommandId, 201);

  hasPendingInfo = true;
  await commandService.processCommandResult('SN-TEST-001', 201, 0, null);
  assert.equal(queued.length, 1);
});

test('autoClearScheduler.runAutoClearCheck queues INFO only for verified devices without pending INFO', async (t) => {
  const queued = [];
  stubQueries(t, {
    getVerifiedDeviceSns: async () => ['DEV001', 'DEV002', 'DEV003'],
    hasPendingCommand: async (sn, type) => sn === 'DEV002' && type === config.COMMAND_TYPES.INFO,
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
    }
  });

  const summary = await autoClearScheduler.runAutoClearCheck();

  assert.deepEqual(summary, { total: 3, queued: 2, skipped: 1 });
  assert.deepEqual(
    queued.map((q) => q.sn),
    ['DEV001', 'DEV003']
  );
  assert.equal(queued[0].params.autoClearCheck, true);
});

test('autoClearScheduler.tick triggers once at 02:00 WIB and skips repeat ticks on the same day', async (t) => {
  autoClearScheduler._resetForTest();
  t.after(() => autoClearScheduler._resetForTest());

  const queued = [];
  stubQueries(t, {
    getVerifiedDeviceSns: async () => ['DEV001'],
    insertCommand: async (sn, type, params) => {
      queued.push({ sn, type, params });
    }
  });

  // 01:59 WIB = 18:59 UTC previous day -> should not trigger
  const before = new Date('2026-11-22T18:59:00.000Z');
  assert.equal(await autoClearScheduler.tick(before), false);
  assert.equal(queued.length, 0);

  // 02:00:10 WIB = 19:00:10 UTC previous day -> should trigger
  const atTwoAm = new Date('2026-11-22T19:00:10.000Z');
  assert.equal(await autoClearScheduler.tick(atTwoAm), true);
  assert.equal(queued.length, 1);

  // 02:00:45 WIB same day -> should not re-trigger
  const sameMinute = new Date('2026-11-22T19:00:45.000Z');
  assert.equal(await autoClearScheduler.tick(sameMinute), false);
  assert.equal(queued.length, 1);
});
