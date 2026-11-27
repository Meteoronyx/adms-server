'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function setupIclock({
  parsers = {},
  deviceService = {},
  attendanceService = {},
  reuploadService = {},
  commandService = {},
  roleScriptService = {},
  userService = {},
  photoService = {},
  queries = {}
} = {}) {
  const routes = [];
  const calls = [];
  const emitted = [];

  const record = (name, impl) => async (...args) => {
    calls.push([name, ...args]);
    return typeof impl === 'function' ? impl(...args) : impl;
  };
  const recordSync = (name, impl) => (...args) => {
    calls.push([name, ...args]);
    return typeof impl === 'function' ? impl(...args) : impl;
  };

  const router = {
    get: (routePath, ...handlers) => routes.push({ method: 'GET', path: routePath, handler: handlers.at(-1) }),
    post: (routePath, ...handlers) => routes.push({ method: 'POST', path: routePath, handler: handlers.at(-1) })
  };

  const rawBodyParser = (req, res, next) => next();
  rawBodyParser.rawBufferParser = (req, res, next) => next();

  const doubles = {
    express: { Router: () => router },
    'src/config': {
      PATHS: {
        ICLOCK: {
          CDATA: '/iclock/cdata',
          GETREQUEST: '/iclock/getrequest',
          DEVICECMD: '/iclock/devicecmd'
        }
      },
      TABLES: {
        OPERLOG: 'OPERLOG',
        ATTPHOTO: 'ATTPHOTO',
        ATTLOG: 'ATTLOG'
      },
      COMMANDS: { CHECK: 'C:1:CHECK' },
      RESPONSE: {
        OK: 'OK',
        ERROR: {
          MISSING_SN: 'ERROR: MISSING SN',
          INVALID_REQUEST: 'ERROR: INVALID REQUEST',
          DEVICE_NOT_VERIFIED: 'ERROR: DEVICE NOT VERIFIED',
          INTERNAL_SERVER_ERROR: 'ERROR: INTERNAL SERVER ERROR'
        }
      }
    },
    'src/middleware/rawBodyParser': rawBodyParser,
    'src/utils/parsers': {
      parseAttendanceLogs: recordSync('parseAttendanceLogs', parsers.parseAttendanceLogs ?? []),
      parseAttendancePhotoStream: recordSync('parseAttendancePhotoStream', parsers.parseAttendancePhotoStream ?? null),
      parseAttendancePhotoBase64: recordSync('parseAttendancePhotoBase64', parsers.parseAttendancePhotoBase64 ?? []),
      parseCommandResults: recordSync('parseCommandResults', parsers.parseCommandResults ?? []),
      parseDeviceInfo: recordSync('parseDeviceInfo', parsers.parseDeviceInfo ?? {})
    },
    'src/services/deviceService': {
      upsertDevice: record('upsertDevice', undefined),
      getDeviceVerificationStatus: record('getDeviceVerificationStatus', deviceService.getDeviceVerificationStatus ?? true),
      handleDeviceHeartbeat: record('handleDeviceHeartbeat', undefined),
      getInitialSyncStatus: record('getInitialSyncStatus', deviceService.getInitialSyncStatus ?? true),
      markInitialSyncCompleted: record('markInitialSyncCompleted', undefined),
      handleDeviceCommandResults: record('handleDeviceCommandResults', undefined),
      handleDeviceCommand: record('handleDeviceCommand', undefined)
    },
    'src/services/attendanceService': {
      getTimeResponse: record('getTimeResponse', 'DateTime=2026-11-27 11:00:00'),
      getHandshakeResponse: record('getHandshakeResponse', 'GET OPTION FROM: SN1'),
      insertAttendanceLogs: record('insertAttendanceLogs', undefined)
    },
    'src/services/reuploadService': {
      getHandshakeMode: recordSync('getHandshakeMode', reuploadService.getHandshakeMode ?? null),
      checkAndRemove: recordSync('checkAndRemove', reuploadService.checkAndRemove ?? null),
      clearHandshakeMode: recordSync('clearHandshakeMode', undefined)
    },
    'src/services/commandService': {
      getAndExecuteNext: record('getAndExecuteNext', commandService.getAndExecuteNext ?? null)
    },
    'src/services/roleScriptService': {
      validateCommandAvailability: recordSync('validateCommandAvailability', roleScriptService.validateCommandAvailability ?? { ok: true }),
      generateScript: recordSync('generateScript', roleScriptService.generateScript ?? '#!/bin/sh\necho ok\n')
    },
    'src/services/userService': {
      handleOperlog: record('handleOperlog', undefined)
    },
    'src/services/photoService': {
      saveAttendancePhoto: record('saveAttendancePhoto', photoService.saveAttendancePhoto ?? { id: 1, photo_time: '2026-11-27', file_size: 4 })
    },
    'src/db/queries': {
      getDeviceOpdId: record('getDeviceOpdId', queries.getDeviceOpdId ?? 'OPD-1'),
      updateDeviceAttlogStamp: record('updateDeviceAttlogStamp', undefined),
      getCommandById: record('getCommandById', queries.getCommandById ?? { id: 10, command_params: {} })
    },
    'src/utils/logger': { info() {}, warn() {}, debug() {}, error() {} }
  };

  const filename = path.resolve(root, 'src/routes/iclock.js');
  const module = { exports: {} };
  const localRequire = (id) => {
    const key = id.startsWith('.')
      ? path.relative(root, path.resolve(path.dirname(filename), id)).replace(/\\/g, '/')
      : id;
    if (Object.hasOwn(doubles, key)) return doubles[key];
    throw new Error(`Unexpected dependency: ${key}`);
  };
  const wrapper = vm.runInThisContext(
    `(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`,
    { filename }
  );
  wrapper(localRequire, module, module.exports);

  const io = {
    to(room) {
      const rooms = [room];
      const target = {
        to(nextRoom) { rooms.push(nextRoom); return target; },
        emit(event, payload) { emitted.push({ rooms, event, payload }); }
      };
      return target;
    }
  };

  async function invoke(method, routePath, reqOverrides = {}) {
    const entry = routes.find(r => r.method === method && r.path === routePath);
    assert.ok(entry, `Route not found: ${method} ${routePath}`);
    const req = {
      query: {},
      params: {},
      ip: '10.0.0.2',
      url: routePath,
      app: { get: (k) => (k === 'io' ? io : null) },
      ...reqOverrides
    };
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) { this.statusCode = code; return this; },
      set(k, v) { this.headers[k] = v; return this; },
      type(v) { this.headers['Content-Type'] = v; return this; },
      send(payload) { this.body = payload; return this; }
    };
    await entry.handler(req, res);
    return res;
  }

  return { invoke, calls, emitted };
}

test('GET /iclock/cdata validates SN, serves time sync, and passes handshakeMode', async () => {
  const { invoke, calls } = setupIclock({
    reuploadService: { getHandshakeMode: () => 'users_only' }
  });

  const missing = await invoke('GET', '/iclock/cdata');
  assert.equal(missing.statusCode, 400);

  const timeRes = await invoke('GET', '/iclock/cdata', { query: { SN: 'SN1', type: 'time' } });
  assert.equal(timeRes.statusCode, 200);
  assert.match(timeRes.body, /^DateTime=/);

  const hsRes = await invoke('GET', '/iclock/cdata', { query: { SN: 'SN1' } });
  assert.equal(hsRes.statusCode, 200);
  const hsCall = calls.find(c => c[0] === 'getHandshakeResponse');
  assert.deepEqual(hsCall[2], { usersOnly: true });
});

test('POST /iclock/cdata handles ATTLOG, OPERLOG, ATTPHOTO, unverified devices, and unknown tables', async () => {
  // Unverified device blocked for ATTLOG & OPERLOG
  const blocked = setupIclock({ deviceService: { getDeviceVerificationStatus: () => false } });
  const resAttBlocked = await blocked.invoke('POST', '/iclock/cdata', { query: { SN: 'SN1', table: 'ATTLOG' }, rawBody: '' });
  assert.equal(resAttBlocked.body, 'ERROR: DEVICE NOT VERIFIED');
  const resOpBlocked = await blocked.invoke('POST', '/iclock/cdata', { query: { SN: 'SN1', table: 'OPERLOG' }, rawBody: '' });
  assert.equal(resOpBlocked.body, 'ERROR: DEVICE NOT VERIFIED');

  // Verified ATTLOG with Stamp query + OPD-scoped socket broadcast
  const att = setupIclock({
    parsers: { parseAttendanceLogs: () => [{ userPin: '10', checkTime: '2026-11-27T08:00:00', status: 0, verifyMode: 1 }] }
  });
  const resAtt = await att.invoke('POST', '/iclock/cdata', {
    query: { SN: 'SN1', table: 'ATTLOG', Stamp: '1764200000' },
    rawBody: '10\t2026-11-27 08:00:00\t0\t1'
  });
  assert.equal(resAtt.body, 'OK');
  assert.ok(att.calls.some(c => c[0] === 'updateDeviceAttlogStamp' && c[2] === 1764200000));
  assert.deepEqual(att.emitted[0], {
    rooms: ['opd:all', 'opd:OPD-1'],
    event: 'attendance_update',
    payload: { sn: 'SN1', logCount: 1 }
  });

  // Unknown table returns OK
  const resUnknown = await att.invoke('POST', '/iclock/cdata', { query: { SN: 'SN1', table: 'OPTIONS' }, rawBody: '' });
  assert.equal(resUnknown.body, 'OK');

  // Verified OPERLOG
  const resOper = await att.invoke('POST', '/iclock/cdata', { query: { SN: 'SN1', table: 'FACE' }, rawBody: 'FACE PIN=1' });
  assert.equal(resOper.body, 'OK');
  assert.ok(att.calls.some(c => c[0] === 'handleOperlog' && c[1] === 'SN1'));
});

test('GET /iclock/getrequest enforces priority: reupload > pendingCommand > initialSync > OK', async () => {
  // 1. Reupload wins over pending command
  const s1 = setupIclock({
    reuploadService: { checkAndRemove: () => ({ mode: 'full' }) },
    commandService: { getAndExecuteNext: () => ({ type: 'INFO', commandString: 'C:2:INFO' }) }
  });
  assert.equal((await s1.invoke('GET', '/iclock/getrequest', { query: { SN: 'SN1', INFO: '1' } })).body, 'C:1:CHECK');

  // 2. Pending command wins over initial sync
  const s2 = setupIclock({
    commandService: { getAndExecuteNext: () => ({ type: 'INFO', commandString: 'C:2:INFO' }) },
    deviceService: { getInitialSyncStatus: () => false }
  });
  assert.equal((await s2.invoke('GET', '/iclock/getrequest', { query: { SN: 'SN1', INFO: '1' } })).body, 'C:2:INFO');

  // 3. Initial sync triggers when INFO present and initial_sync_completed is false
  const s3 = setupIclock({ deviceService: { getInitialSyncStatus: () => false } });
  assert.equal((await s3.invoke('GET', '/iclock/getrequest', { query: { SN: 'SN1', INFO: '1' } })).body, 'C:1:CHECK');
  assert.ok(s3.calls.some(c => c[0] === 'markInitialSyncCompleted'));

  // 4. Normal OK
  const s4 = setupIclock({ deviceService: { getInitialSyncStatus: () => true } });
  assert.equal((await s4.invoke('GET', '/iclock/getrequest', { query: { SN: 'SN1', INFO: '1' } })).body, 'OK');
});

test('POST /iclock/devicecmd routes command results vs device info and clears handshake mode on CMD=CHECK', async () => {
  const s1 = setupIclock({
    parsers: { parseCommandResults: () => [{ id: 10, returnValue: 0 }] }
  });
  const res1 = await s1.invoke('POST', '/iclock/devicecmd', {
    query: { SN: 'SN1' },
    rawBody: 'ID=10&Return=0&CMD=CHECK'
  });
  assert.equal(res1.body, 'OK');
  assert.ok(s1.calls.some(c => c[0] === 'handleDeviceCommandResults'));
  assert.ok(s1.calls.some(c => c[0] === 'clearHandshakeMode' && c[1] === 'SN1'));
  assert.equal(s1.emitted[0].event, 'device_update');

  const s2 = setupIclock({
    parsers: { parseCommandResults: () => [], parseDeviceInfo: () => ({ fwVersion: '8.0' }) }
  });
  await s2.invoke('POST', '/iclock/devicecmd', { query: { SN: 'SN1' }, rawBody: 'FWVersion=8.0' });
  assert.ok(s2.calls.some(c => c[0] === 'handleDeviceCommand'));
});

test('POST /iclock/fdata saves photo on valid stream and catches errors cleanly without ReferenceError', async () => {
  const valid = setupIclock({
    parsers: {
      parseAttendancePhotoStream: () => ({
        pin: '101',
        sn: 'SN-PHOTO',
        size: 4,
        photoTime: new Date('2026-11-27T08:00:00Z'),
        jpegBuffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9])
      })
    },
    photoService: {
      saveAttendancePhoto: async () => ({
        id: 99,
        device_name: 'Lobby',
        nama_opd: 'Diskominfo',
        pegawai_name: 'Adi',
        photo_time: '2026-11-27T08:00:00Z',
        file_size: 4
      })
    }
  });

  const okRes = await valid.invoke('POST', '/iclock/fdata', { query: { SN: 'SN-PARAM' }, rawBuffer: Buffer.from('x') });
  assert.equal(okRes.body, 'OK');
  assert.equal(valid.emitted[0].event, 'attendance_photo');
  assert.equal(valid.emitted[0].payload.photo_url, '/admin/attendance-photos/99');

  // Regression test: throwing inside try before/after targetSn reassignment must NOT ReferenceError in catch
  const failing = setupIclock({
    parsers: {
      parseAttendancePhotoStream: () => { throw new Error('corrupt stream'); }
    }
  });
  const errRes = await failing.invoke('POST', '/iclock/fdata', { query: { SN: 'SN-PARAM' }, rawBuffer: Buffer.from('bad') });
  assert.equal(errRes.statusCode, 200);
  assert.equal(errRes.body, 'OK');
});

test('GET /r/:id validates ID, checks availability, and returns shell script', async () => {
  const sInvalid = setupIclock();
  const rInvalid = await sInvalid.invoke('GET', '/r/:id', { params: { id: 'abc' } });
  assert.equal(rInvalid.statusCode, 404);

  const sExpired = setupIclock({
    roleScriptService: { validateCommandAvailability: () => ({ ok: false, status: 410, message: 'EXPIRED' }) }
  });
  const rExpired = await sExpired.invoke('GET', '/r/:id', { params: { id: '12' } });
  assert.equal(rExpired.statusCode, 410);
  assert.match(rExpired.body, /EXPIRED/);

  const sValid = setupIclock({
    roleScriptService: {
      validateCommandAvailability: () => ({ ok: true }),
      generateScript: () => '#!/bin/sh\necho DONE\n'
    }
  });
  const rValid = await sValid.invoke('GET', '/r/:id', { params: { id: '12' } });
  assert.equal(rValid.statusCode, 200);
  assert.match(rValid.body, /echo DONE/);
});
