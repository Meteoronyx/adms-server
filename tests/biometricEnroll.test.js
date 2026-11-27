'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
const commandService = require('../src/services/commandService');
const biometricController = require('../src/controllers/admin/biometricController');

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
};

const createMockReq = (body = {}) => ({
  params: { sn: 'SN-TEST-001' },
  body,
  device: { sn: 'SN-TEST-001', name: 'X601 Test' },
  ip: '127.0.0.1'
});

test('commandService.buildCommandString builds ENROLL_FP with FID=111 for face', () => {
  const cmd = commandService.buildCommandString({
    id: 102,
    command_type: config.COMMAND_TYPES.ENROLL_FP,
    command_params: {
      pin: 99999,
      fid: 111,
      retry: 3,
      overwrite: 1
    }
  });

  assert.equal(cmd, 'C:102:ENROLL_FP PIN=99999\tFID=111\tRETRY=3\tOVERWRITE=1');
});

test('enrollFingerprint accepts fid=0..9 and fid=111', async (t) => {
  const originalQueueCommand = commandService.queueCommand;
  const queued = [];
  commandService.queueCommand = async (sn, type, params) => {
    queued.push({ sn, type, params });
  };
  t.after(() => {
    commandService.queueCommand = originalQueueCommand;
  });

  const resFp = createMockRes();
  await biometricController.enrollFingerprint(
    createMockReq({ pin: '1234', fid: 5, retry: 2, overwrite: 1 }),
    resFp
  );
  assert.equal(resFp.statusCode, 200);
  assert.equal(resFp.body.success, true);
  assert.equal(resFp.body.params.fid, 5);

  const resFace = createMockRes();
  await biometricController.enrollFingerprint(
    createMockReq({ pin: '99999', fid: 111, retry: 3, overwrite: 1 }),
    resFace
  );
  assert.equal(resFace.statusCode, 200);
  assert.equal(resFace.body.success, true);
  assert.equal(resFace.body.params.fid, 111);

  assert.equal(queued.length, 2);
  assert.deepEqual(queued[1], {
    sn: 'SN-TEST-001',
    type: config.COMMAND_TYPES.ENROLL_FP,
    params: { pin: 99999, fid: 111, retry: 3, overwrite: 1 }
  });
});

test('enrollFingerprint rejects invalid fid values with 400', async (t) => {
  const originalQueueCommand = commandService.queueCommand;
  let called = false;
  commandService.queueCommand = async () => {
    called = true;
  };
  t.after(() => {
    commandService.queueCommand = originalQueueCommand;
  });

  for (const invalidFid of [-1, 10, 110, 112, 'abc']) {
    const res = createMockRes();
    await biometricController.enrollFingerprint(
      createMockReq({ pin: '99999', fid: invalidFid }),
      res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  }
  assert.equal(called, false);
});

test('enrollFace queues ENROLL_FP with fid=111 and preserves backend defaults', async (t) => {
  const originalQueueCommand = commandService.queueCommand;
  const queued = [];
  commandService.queueCommand = async (sn, type, params) => {
    queued.push({ sn, type, params });
  };
  t.after(() => {
    commandService.queueCommand = originalQueueCommand;
  });

  const res = createMockRes();
  await biometricController.enrollFace(
    createMockReq({ pin: '99999' }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.params, {
    pin: 99999,
    fid: 111,
    retry: 1,
    overwrite: 0
  });
  assert.equal(queued.length, 1);
  assert.deepEqual(queued[0].params, {
    pin: 99999,
    fid: 111,
    retry: 1,
    overwrite: 0
  });
});
