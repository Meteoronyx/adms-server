'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const commandTypes = [
  'CLEAR_LOG', 'INFO', 'REBOOT', 'DATA_USER', 'DELETE_USER',
  'ENROLL_FP', 'DATA_FP', 'DATA_FACE', 'DATA_SMS', 'DELETE_SMS'
];
const config = {
  COMMAND_TYPES: Object.fromEntries(commandTypes.map(type => [type, type])),
  RESPONSE: { ADMIN: {
    COMMAND_QUEUED: 'Command queued', REUPLOAD_QUEUED: 'Reupload queued',
    SYNC_USERS_QUEUED: 'User sync queued',
    DEVICE_NOT_FOUND: 'Device not found', MISSING_PIN: 'Missing pin',
    MISSING_PRIVILEGE: 'Missing privilege'
  } },
  PATHS: { ADMIN: Object.fromEntries([
    'REUPLOAD', 'SYNC_USERS', 'COMMAND_QUEUE', 'CLEAR_LOG', 'INFO', 'REBOOT', 'USER',
    'USER_DELETE', 'ENROLL_FP', 'ENROLL_FACE', 'TRANSFER_FP', 'TRANSFER_FACE', 'TRANSFER_ALL'
  ].map(key => [key, key])) }
};

// Load real controller modules with explicit doubles, without opening DB connections,
// starting background services, launching Chromium, or changing require.cache.
function setup({ scope = null, queries = {}, users = {}, commands = {}, files = {} } = {}) {
  const calls = [];
  const record = (name, result) => (...args) => {
    calls.push([name, ...args]);
    return typeof result === 'function' ? result(...args) : result;
  };
  const doubles = {
    'src/config': config,
    'src/db/queries': Object.fromEntries(Object.entries(queries)
      .map(([name, result]) => [name, record(name, result)])),
    'src/services/userService': Object.fromEntries(Object.entries(users)
      .map(([name, result]) => [name, record(name, result)])),
    'src/services/commandService': {
      queueCommand: record('queueCommand', undefined),
      ...Object.fromEntries(Object.entries(commands)
        .map(([name, result]) => [name, record(name, result)]))
    },
    'src/services/reuploadService': {
      addToQueue: record('addToQueue', undefined),
      getQueueStatus: record('getReuploadQueue', { SOURCE: { queuedAt: 'now' }, OTHER: { queuedAt: 'later' } })
    },
    'src/services/photoService': { resolvePhotoAbsolutePath: record('resolvePhotoAbsolutePath', 'photo.jpg') },
    'src/services/pdfService': { generateAttendancePdf: record('generateAttendancePdf', Buffer.from('pdf')) },
    'src/utils/logger': { info() {}, error: record('logError', undefined) },
    'src/middleware/apiKeyAuth': {
      resolveScopedOpdIds: record('resolveScopedOpdIds', scope),
      canAccessOpd: (user, id) => user.role === 'admin' || Boolean(id && (user.accessible_opd_ids || []).includes(id))
    },
    fs: { existsSync: record('existsSync', true), ...files }
  };
  const cache = new Map();
  function load(relativePath) {
    const filename = path.resolve(root, relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const localRequire = id => {
      const key = id.startsWith('.')
        ? path.relative(root, path.resolve(path.dirname(filename), id)).replace(/\\/g, '/')
        : id;
      if (Object.hasOwn(doubles, key)) return doubles[key];
      assert.ok(key.startsWith('src/controllers/'), `Unexpected dependency: ${key}`);
      return load(`${key}.js`);
    };
    const wrapper = vm.runInThisContext(
      `(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`, { filename }
    );
    wrapper(localRequire, module, module.exports);
    return module.exports;
  }
  const controller = {};
  for (const domain of ['device', 'command', 'biometric', 'pegawai', 'attendance', 'broadcast', 'dashboard']) {
    const mod = load(`src/controllers/admin/${domain}Controller.js`);
    for (const [key, fn] of Object.entries(mod)) {
      assert.ok(!Object.hasOwn(controller, key), `Duplicate handler export: ${key}`);
      controller[key] = fn;
    }
  }
  return { controller, calls, load, doubles };
}

function request(overrides = {}) {
  return {
    params: { sn: 'TARGET', pin: '42', id: '7' }, query: {}, body: {}, ip: '127.0.0.1',
    device: { sn: 'TARGET', name: 'Terminal', device_name: 'Lobby', opd_id: 'CHILD' },
    user: { role: 'operator', opd_id: 'PARENT', accessible_opd_ids: ['PARENT', 'CHILD'] },
    ...overrides
  };
}

async function invoke(controller, handler, req = request()) {
  const res = {
    statusCode: 200, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    send(body) { this.body = body; return this; },
    end() { this.ended = true; }
  };
  await controller[handler](req, res);
  return res;
}

const domains = {
  device: ['reuploadDevice', 'syncDeviceUsers', 'getReuploadQueue', 'verifyDevice', 'unverifyDevice', 'listDevices', 'updateDeviceName'],
  command: ['clearLog', 'info', 'reboot', 'updateUser', 'deleteUser', 'getCommandQueue', 'getPendingCommandsCount'],
  biometric: ['enrollFingerprint', 'enrollFace', 'checkFingerprintOnDevice', 'checkFaceOnDevice', 'transferFingerprint', 'transferFace', 'transferAllBiometrics'],
  pegawai: ['getPegawai', 'listPegawai', 'searchPegawai', 'getPegawaiByDevice'],
  attendance: ['getAttendanceLogs', 'exportAttendancePdf', 'getRecentAttendancePhotos', 'getAttendancePhotoFile'],
  broadcast: ['listBroadcastMessages', 'createBroadcastMessage', 'deleteBroadcastMessage'],
  dashboard: ['getDashboardStats']
};

test('domain controllers export every handler exactly once without overlaps', () => {
  const { controller, load } = setup();
  const names = Object.values(domains).flat();
  assert.equal(new Set(names).size, 33);
  assert.deepEqual(Object.keys(controller).sort(), names.sort());
  for (const [domain, handlers] of Object.entries(domains)) {
    const module = load(`src/controllers/admin/${domain}Controller.js`);
    assert.deepEqual(Object.keys(module).sort(), [...handlers].sort());
    for (const name of handlers) assert.equal(controller[name], module[name]);
  }
});

test('routes retain their paths, permissions, handler bindings and middleware order', () => {
  const { controller, doubles } = setup();
  const routes = [];
  const router = Object.fromEntries(['use', 'get', 'post', 'patch', 'put', 'delete']
    .map(method => [method, (...args) => routes.push([method, ...args])]));
  const auth = () => {};
  Object.assign(auth, doubles['src/middleware/apiKeyAuth']);
  const validateDevice = () => {};
  Object.assign(doubles, {
    express: { Router: () => router },
    'src/middleware/apiKeyAuth': auth,
    'src/middleware/deviceCheck': validateDevice,
    'src/middleware/asyncHandler': handler => ({ handler }),
    'src/middleware/requireRole': { requirePermission: permission => ({ permission }) },
    'src/controllers/opdController': Object.fromEntries([
      'listOpds', 'getOpd', 'triggerAutoMap', 'createOpd', 'updateOpd', 'deleteOpd'
    ].map(name => [name, () => {}]))
  });
  // Reuse the isolated loader after adding router dependencies.
  const filename = path.join(root, 'src/routes/admin.js');
  const module = { exports: {} };
  const localRequire = id => {
    const key = id.startsWith('.')
      ? path.relative(root, path.resolve(path.dirname(filename), id)).replace(/\\/g, '/') : id;
    if (Object.hasOwn(doubles, key)) return doubles[key];
    const domain = /\/admin\/(\w+)Controller$/.exec(key)?.[1];
    assert.ok(domain && domains[domain], `Unexpected route dependency: ${key}`);
    return Object.fromEntries(domains[domain].map(name => [name, controller[name]]));
  };
  vm.runInThisContext(`(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`, { filename })(localRequire, module, module.exports);
  assert.equal(module.exports, router);
  assert.deepEqual(routes[0], ['use', '/admin', auth]);
  const expected = [
    ['post', 'REUPLOAD', 'devices:command', true, 'reuploadDevice'],
    ['post', 'SYNC_USERS', 'devices:command', true, 'syncDeviceUsers'],
    ['get', '/admin/reupload/queue', 'devices:command', false, 'getReuploadQueue'],
    ['get', 'COMMAND_QUEUE', 'devices:command', false, 'getCommandQueue'],
    ['get', '/admin/commands/count', 'devices:command', false, 'getPendingCommandsCount'],
    ['post', '/admin/verify/:sn', 'devices:write', true, 'verifyDevice'],
    ['delete', '/admin/verify/:sn', 'devices:write', true, 'unverifyDevice'],
    ['get', '/admin/devices', 'devices:read', false, 'listDevices'],
    ['patch', '/admin/devices/:sn', 'devices:write', false, 'updateDeviceName'],
    ['post', 'CLEAR_LOG', 'devices:command', true, 'clearLog'],
    ['post', 'INFO', 'devices:command', true, 'info'],
    ['post', 'REBOOT', 'devices:command', true, 'reboot'],
    ['post', 'USER', 'devices:write', true, 'updateUser'],
    ['delete', 'USER_DELETE', 'devices:write', true, 'deleteUser'],
    ['post', 'ENROLL_FP', 'fingerprint:manage', true, 'enrollFingerprint'],
    ['post', 'ENROLL_FACE', 'fingerprint:manage', true, 'enrollFace'],
    ['get', '/admin/fingerprint-check', 'fingerprint:manage', false, 'checkFingerprintOnDevice'],
    ['post', 'TRANSFER_FP', 'fingerprint:manage', true, 'transferFingerprint'],
    ['get', '/admin/face-check', 'fingerprint:manage', false, 'checkFaceOnDevice'],
    ['post', 'TRANSFER_FACE', 'fingerprint:manage', true, 'transferFace'],
    ['post', 'TRANSFER_ALL', 'fingerprint:manage', true, 'transferAllBiometrics'],
    ['get', '/admin/pegawai', 'devices:read', false, 'listPegawai'],
    ['get', '/admin/pegawai/search', 'devices:read', false, 'searchPegawai'],
    ['get', '/admin/pegawai/:pin', 'devices:read', false, 'getPegawai'],
    ['get', '/admin/devices/:sn/pegawai', 'devices:read', true, 'getPegawaiByDevice'],
    ['get', '/admin/attendance', 'attendance:read', false, 'getAttendanceLogs'],
    ['get', '/admin/attendance/export/pdf', 'attendance:export', false, 'exportAttendancePdf'],
    ['get', '/admin/attendance-photos/recent', 'attendance:read', false, 'getRecentAttendancePhotos'],
    ['get', '/admin/attendance-photos/:id', 'attendance:read', false, 'getAttendancePhotoFile'],
    ['get', '/admin/broadcast-messages', 'devices:command', false, 'listBroadcastMessages'],
    ['post', '/admin/broadcast-messages', 'devices:command', false, 'createBroadcastMessage'],
    ['delete', '/admin/broadcast-messages/:id', 'devices:command', false, 'deleteBroadcastMessage'],
    ['get', '/admin/stats', 'devices:read', false, 'getDashboardStats']
  ];
  assert.equal(routes.length, 1 + 6 + expected.length);
  expected.forEach(([method, url, permission, validates, handler], index) => {
    assert.deepEqual(routes[index + 7], [method, url, { permission },
      ...(validates ? [validateDevice] : []), { handler: controller[handler] }]);
  });
});

for (const handler of ['listDevices', 'listPegawai', 'searchPegawai', 'getAttendanceLogs',
  'getDashboardStats', 'getRecentAttendancePhotos', 'listBroadcastMessages', 'getCommandQueue',
  'getPendingCommandsCount', 'getPegawai', 'exportAttendancePdf']) {
  test(`${handler}: empty OPD scope never queries data`, async () => {
    const { controller, calls } = setup({ scope: [] });
    const res = await invoke(controller, handler, request({ query: { q: ' Ana ', pin: '42', year: '2026', month: '12' } }));
    assert.equal(res.statusCode, ['getPegawai', 'exportAttendancePdf'].includes(handler) ? 403 : 200);
    assert.deepEqual(calls.map(call => call[0]), ['resolveScopedOpdIds']);
    if (res.statusCode === 200) assert.equal(res.body.success, true);
  });
}

for (const scope of [null, ['PARENT', 'CHILD']]) {
  test(`listDevices preserves ${scope === null ? 'unrestricted' : 'scoped'} access`, async () => {
    const { controller, calls } = setup({ scope, queries: { getAllDevices: [{ sn: 'A' }], getOfflineDevices: [] } });
    const res = await invoke(controller, 'listDevices', request({ query: { opd_id: 'PARENT' } }));
    assert.deepEqual(calls.slice(1), [['getAllDevices', scope], ['getOfflineDevices', scope]]);
    assert.equal(calls[0][2], 'PARENT');
    assert.deepEqual(res.body, { success: true, devices: [{ sn: 'A' }], offlineDevices: [] });
  });
}

test('reupload queue only includes accessible devices for non-admin', async () => {
  const { controller } = setup({ queries: { getDeviceInfo: sn => ({ opd_id: sn === 'SOURCE' ? 'CHILD' : 'OUTSIDE' }) } });
  const res = await invoke(controller, 'getReuploadQueue');
  assert.deepEqual(res.body, { success: true, queue: { SOURCE: { queuedAt: 'now' } } });
});

test('verifyDevice rejects incomplete metadata before updating DB', async () => {
  const { controller, calls } = setup();
  for (const device of [{ device_name: ' ' }, { device_name: 'Lobby', opd_id: null }]) {
    assert.equal((await invoke(controller, 'verifyDevice', request({ device }))).statusCode, 400);
  }
  assert.deepEqual(calls, []);
});

test('non-admin cannot change device OPD or edit outside scope', async () => {
  const { controller, calls } = setup({ queries: { getDeviceInfo: { opd_id: 'CHILD' }, updateDeviceDetails: undefined } });
  await invoke(controller, 'updateDeviceName', request({ body: { device_name: ' New ', opd_id: 'OUTSIDE' } }));
  assert.deepEqual(calls[1], ['updateDeviceDetails', 'TARGET', { deviceName: 'New' }]);
  const outside = setup({ queries: { getDeviceInfo: { opd_id: 'OUTSIDE' } } });
  assert.equal((await invoke(outside.controller, 'updateDeviceName')).statusCode, 403);
  assert.equal(outside.calls.length, 1);
});

test('command queue keeps filters, pagination and response aliases', async () => {
  const rows = [{ id: 1 }];
  const { controller, calls } = setup({ scope: ['CHILD'], commands: { getQueueStatus: { rows, total: 8 } } });
  const res = await invoke(controller, 'getCommandQueue', request({ query: {
    limit: '999', offset: '-2', status: ' done ', search: ' Ana ', command_type: ' INFO '
  } }));
  assert.deepEqual(calls[1], ['getQueueStatus', ['CHILD'], {
    limit: 100, offset: 0, status: 'done', search: 'Ana', commandType: 'INFO', all: false
  }]);
  assert.deepEqual(res.body, { success: true, commands: rows, data: rows, total: 8, count: 1, limit: 100, offset: 0 });
});

for (const flag of ['count', 'count_only']) {
  test(`command queue supports ${flag} without fetching rows`, async () => {
    const { controller, calls } = setup({ commands: { getQueueCount: 9 } });
    const res = await invoke(controller, 'getCommandQueue', request({ query: { [flag]: 'true' } }));
    assert.deepEqual(res.body, { success: true, count: 9 });
    assert.deepEqual(calls[1], ['getQueueCount', null]);
  });
}

test('updateUser queues before optimistic updates and tolerates mapping failure', async () => {
  const { controller, calls } = setup({ queries: {
    upsertPegawaiDeviceMapping: () => { throw new Error('DB unavailable'); }, upsertPegawai: undefined
  } });
  const res = await invoke(controller, 'updateUser', request({ body: { pin: '42', privilege: '0', passwd: '0012', name: ' Ana ' } }));
  assert.deepEqual(calls[0], ['queueCommand', 'TARGET', 'DATA_USER', { pin: 42, privilege: 0, passwd: 12, name: 'Ana' }]);
  assert.deepEqual(calls[1], ['upsertPegawaiDeviceMapping', '42', 'TARGET', 'Lobby', 0, '0012']);
  assert.equal(calls[2][0], 'logError');
  assert.equal(calls[3][0], 'upsertPegawai');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.params, { pin: '42', privilege: '0', passwd: 12, name: 'Ana' });
});

for (const activeCount of [0, 1]) {
  test(`deleteUser only soft-deletes globally when active mapping count is zero (${activeCount})`, async () => {
    const { controller, calls } = setup({ queries: {
      softDeletePegawaiDeviceMapping: undefined, deletePegawaiFingerprints: undefined,
      countActiveDeviceMappings: activeCount, softDeletePegawai: undefined
    } });
    const res = await invoke(controller, 'deleteUser');
    assert.deepEqual(calls.map(call => call[0]), ['queueCommand', 'softDeletePegawaiDeviceMapping',
      'deletePegawaiFingerprints', 'countActiveDeviceMappings', ...(activeCount === 0 ? ['softDeletePegawai'] : [])]);
    assert.equal(res.body.success, true);
  });
}

const transferHandlers = ['transferFingerprint', 'transferFace', 'transferAllBiometrics'];
const pegawai = { name: 'Ana', privilege: 0, password: '0012', timezone: '1', group_no: 2 };
const fingerprints = [{ finger_id: 0, template: 'fp0' }, { finger_id: 1, template: 'fp1' }];
const faces = [{ face_id: 0, template: 'face0' }, { face_id: 1, size: 20, valid: 1, template: 'face1' }];

for (const handler of transferHandlers) {
  test(`${handler} preserves command payloads and order`, async () => {
    let pending = false;
    const { controller, calls } = setup({
      queries: { getDeviceInfo: { opd_id: 'CHILD' }, getPegawaiBasicInfo: pegawai },
      users: { checkFingerprintOnDevice: fingerprints, checkFaceOnDevice: faces },
      commands: { queueCommand: async () => {
        assert.equal(pending, false, 'commands must be queued sequentially');
        pending = true;
        await Promise.resolve();
        pending = false;
      } }
    });
    const res = await invoke(controller, handler, request({ body: { pin: '42', source_sn: 'SOURCE' } }));
    const expected = [];
    if (handler !== 'transferFingerprint') expected.push(['queueCommand', 'TARGET', 'DATA_USER', {
      pin: '42', name: 'Ana', privilege: 0, passwd: '0012'
    }]);
    if (handler !== 'transferFace') expected.push(...fingerprints.map(fp => ['queueCommand', 'TARGET', 'DATA_FP', {
      pin: '42', finger_id: fp.finger_id, template: fp.template,
      user_info: { name: 'Ana', privilege: 0, timezone: '1', group_no: 2 }
    }]));
    if (handler !== 'transferFingerprint') expected.push(...faces.map(face => ['queueCommand', 'TARGET', 'DATA_FACE', {
      pin: '42', face_id: face.face_id, size: face.size || 1214, valid: face.valid || 1, template: face.template
    }]));
    assert.deepEqual(calls.filter(call => call[0] === 'queueCommand'), expected);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.pegawai_pin, '42');
    assert.deepEqual(res.body.target_device, { sn: 'TARGET', name: 'Terminal' });
    if (handler === 'transferAllBiometrics') assert.equal(res.body.total_commands, 5);
  });

  for (const [source, status] of [[null, 404], [{ opd_id: 'OUTSIDE' }, 403]]) {
    test(`${handler} rejects ${status} source before querying biometrics or queueing`, async () => {
      const { controller, calls } = setup({ queries: { getDeviceInfo: source } });
      const res = await invoke(controller, handler, request({ body: { pin: '42', source_sn: 'SOURCE' } }));
      assert.equal(res.statusCode, status);
      assert.deepEqual(calls, [['getDeviceInfo', 'SOURCE']]);
    });
  }
}

test('transfer stops at queue failure without returning success', async () => {
  const error = new Error('queue failed');
  const { controller, calls } = setup({
    queries: { getDeviceInfo: { opd_id: 'CHILD' }, getPegawaiBasicInfo: pegawai },
    users: { checkFaceOnDevice: faces }, commands: { queueCommand: () => { throw error; } }
  });
  await assert.rejects(invoke(controller, 'transferFace', request({ body: { pin: '42', source_sn: 'SOURCE' } })), error);
  assert.equal(calls.filter(call => call[0] === 'queueCommand').length, 1);
});

test('broadcast creation sanitizes text, preserves Jakarta time and queues each target', async () => {
  const { controller, calls } = setup({ scope: ['PARENT', 'CHILD'], queries: {
    getTargetDevicesForBroadcast: [{ sn: 'A' }, { sn: 'B' }],
    createBroadcastMessage: { id: 7, start_time: '2026-12-01T17:00:00Z' }
  } });
  const res = await invoke(controller, 'createBroadcastMessage', request({ body: { message: ' Hello\nworld\t ', duration_minutes: '30' } }));
  assert.deepEqual(calls.find(call => call[0] === 'createBroadcastMessage'), ['createBroadcastMessage', {
    opdId: 'PARENT', deviceSn: null, message: 'Hello world', tag: 253,
    startTime: null, durationMinutes: 30, createdBy: null
  }]);
  assert.deepEqual(calls.filter(call => call[0] === 'queueCommand'), ['A', 'B'].map(sn => ['queueCommand', sn, 'DATA_SMS', {
    uid: 7, message: 'Hello world', duration: 30, startTime: '2026-12-02 00:00:00', tag: 253
  }]));
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.queued_devices, ['A', 'B']);
  assert.equal(res.body.broadcast.pending_count, 2);
});

test('broadcast deletion checks OPD and deactivates before queueing DELETE_SMS', async () => {
  const record = { id: 7, opd_id: 'CHILD', device_sn: null };
  const { controller, calls } = setup({ queries: {
    getBroadcastMessageById: record, deactivateBroadcastMessage: undefined,
    getTargetDevicesForBroadcast: [{ sn: 'A' }]
  } });
  assert.equal((await invoke(controller, 'deleteBroadcastMessage')).statusCode, 200);
  assert.deepEqual(calls, [['getBroadcastMessageById', 7], ['deactivateBroadcastMessage', 7],
    ['getTargetDevicesForBroadcast', { opdId: 'CHILD', deviceSn: null }], ['queueCommand', 'A', 'DELETE_SMS', { uid: 7 }]]);
  const outside = setup({ queries: { getBroadcastMessageById: { ...record, opd_id: 'OUTSIDE' } } });
  assert.equal((await invoke(outside.controller, 'deleteBroadcastMessage')).statusCode, 403);
  assert.equal(outside.calls.length, 1);
});

for (const preview of ['true', undefined]) {
  test(`PDF export preserves December rollover and ${preview ? 'inline' : 'attachment'} headers`, async () => {
    const { controller, calls } = setup({ scope: ['CHILD'], queries: {
      getPegawaiProfileForExport: pegawai, getMonthlyLogsForPegawai: []
    } });
    const res = await invoke(controller, 'exportAttendancePdf', request({ query: { pin: '42', year: '2026', month: '12', preview } }));
    assert.deepEqual(calls[2], ['getMonthlyLogsForPegawai', '42', '2026-12-01 00:00:00', '2027-01-01 00:00:00', ['CHILD']]);
    assert.deepEqual(res.headers, {
      'Content-Type': 'application/pdf', 'Content-Length': 3,
      'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="Rekap_Presensi_42_2026-12.pdf"`
    });
    assert.deepEqual(res.body, Buffer.from('pdf'));
  });
}

test('photo access allows either device or employee OPD and preserves stream error handling', async () => {
  const photo = { device_opd_id: 'OUTSIDE', pegawai_opd_id: 'CHILD', file_path: 'stored.jpg' };
  let onError;
  let piped;
  const { controller } = setup({ queries: { getAttendancePhotoById: photo }, files: {
    createReadStream: () => ({ on: (event, fn) => { assert.equal(event, 'error'); onError = fn; }, pipe: res => { piped = res; } })
  } });
  const res = await invoke(controller, 'getAttendancePhotoFile');
  assert.equal(piped, res);
  assert.deepEqual(res.headers, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' });
  res.headersSent = true;
  onError();
  assert.equal(res.statusCode, 200);
  res.headersSent = false;
  onError();
  assert.equal(res.statusCode, 500);
  assert.equal(res.ended, true);
  const outside = setup({ queries: { getAttendancePhotoById: { ...photo, pegawai_opd_id: 'OUTSIDE' } } });
  assert.equal((await invoke(outside.controller, 'getAttendancePhotoFile')).statusCode, 403);
  assert.equal(outside.calls.length, 1);
});
