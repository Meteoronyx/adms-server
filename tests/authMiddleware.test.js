'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');

const root = path.resolve(__dirname, '..');
const SECRET = 'test-jwt-secret-key';

function setupAuth({ jwtSecret = SECRET, queryHandler = async () => ({ rows: [] }) } = {}) {
  const queryCalls = [];
  const doubles = {
    jsonwebtoken: jwt,
    'src/config': {
      JWT_SECRET: jwtSecret,
      RESPONSE: { ADMIN: { UNAUTHORIZED: 'Unauthorized' } }
    },
    'src/db/connection': {
      query: async (sql, params) => {
        queryCalls.push({ sql, params });
        return queryHandler(sql, params);
      }
    },
    'src/utils/logger': { info() {}, warn() {}, error() {} }
  };

  function load(relativePath) {
    const filename = path.resolve(root, relativePath);
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
    return module.exports;
  }

  return {
    apiKeyAuth: load('src/middleware/apiKeyAuth.js'),
    requireRoleMod: load('src/middleware/requireRole.js'),
    queryCalls
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    clearedCookies: [],
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    clearCookie(name, opts) { this.clearedCookies.push({ name, opts }); }
  };
}

test('apiKeyAuth returns 500 when JWT_SECRET is not configured', async () => {
  const { apiKeyAuth } = setupAuth({ jwtSecret: '' });
  const res = createRes();
  let nextCalled = false;
  await apiKeyAuth({ cookies: {}, headers: {} }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
});

test('apiKeyAuth returns 401 when no token is provided', async () => {
  const { apiKeyAuth } = setupAuth();
  const res = createRes();
  let nextCalled = false;
  await apiKeyAuth({ cookies: {}, headers: {} }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('apiKeyAuth accepts static JWT_SECRET via x-api-key as system admin', async () => {
  const { apiKeyAuth } = setupAuth();
  const req = { cookies: {}, headers: { 'x-api-key': SECRET } };
  const res = createRes();
  let nextCalled = false;
  await apiKeyAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'admin');
  assert.deepEqual(req.user.permissions, ['*']);
});

test('apiKeyAuth verifies JWT from cookie or Bearer header and attaches scoped user profile', async () => {
  const opdParent = '11111111-1111-1111-1111-111111111111';
  const opdChild = '22222222-2222-2222-2222-222222222222';
  const { apiKeyAuth } = setupAuth({
    queryHandler: async (sql) => {
      if (sql.includes('FROM users u')) {
        return {
          rows: [{
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            username: 'op_kominfo',
            name: 'Operator',
            is_active: true,
            role_id: 2,
            opd_id: opdParent,
            nama_opd: 'Diskominfo',
            kdunker: '216000000000000',
            role_slug: 'operator',
            role_name: 'Operator OPD',
            permissions: ['devices:read']
          }]
        };
      }
      if (sql.includes('FROM opds')) {
        return { rows: [{ id: opdParent }, { id: opdChild }] };
      }
      return { rows: [] };
    }
  });

  const token = jwt.sign({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', username: 'op_kominfo' }, SECRET);

  // Via Bearer header
  const reqBearer = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
  const resBearer = createRes();
  let nextBearer = false;
  await apiKeyAuth(reqBearer, resBearer, () => { nextBearer = true; });
  assert.equal(nextBearer, true);
  assert.equal(reqBearer.user.username, 'op_kominfo');
  assert.equal(reqBearer.user.is_parent_opd, true);
  assert.deepEqual(reqBearer.user.accessible_opd_ids, [opdParent, opdChild]);

  // Via cookie
  const reqCookie = { cookies: { token }, headers: {} };
  const resCookie = createRes();
  let nextCookie = false;
  await apiKeyAuth(reqCookie, resCookie, () => { nextCookie = true; });
  assert.equal(nextCookie, true);
  assert.deepEqual(reqCookie.user.permissions, ['devices:read']);
});

test('apiKeyAuth clears cookie and returns 401 on invalid JWT or inactive user', async () => {
  const { apiKeyAuth } = setupAuth({
    queryHandler: async () => ({ rows: [{ id: 'u1', is_active: false }] })
  });

  // Invalid JWT
  const res1 = createRes();
  await apiKeyAuth({ cookies: { token: 'bad.jwt.token' }, headers: {} }, res1, () => {});
  assert.equal(res1.statusCode, 401);
  assert.equal(res1.clearedCookies[0].name, 'token');

  // Inactive user
  const validToken = jwt.sign({ id: 'u1', username: 'inactive' }, SECRET);
  const res2 = createRes();
  await apiKeyAuth({ cookies: { token: validToken }, headers: {} }, res2, () => {});
  assert.equal(res2.statusCode, 401);
  assert.equal(res2.clearedCookies[0].name, 'token');
});

test('getAccessibleOpdIds resolves parent/child hierarchy, Induk prefix, and fallback on query error', async () => {
  const indukId = 'opd-induk';
  const subId = 'opd-sub';

  // Normal query with Induk kdunker (15 chars ending with 11 zeros)
  const { apiKeyAuth, queryCalls } = setupAuth({
    queryHandler: async () => ({ rows: [{ id: indukId }, { id: subId }] })
  });
  assert.deepEqual(await apiKeyAuth.getAccessibleOpdIds(null), []);
  const ids = await apiKeyAuth.getAccessibleOpdIds(indukId, '216000000000000');
  assert.deepEqual(ids, [indukId, subId]);
  assert.equal(queryCalls[0].params[1], '2160%');

  // Fallback when first query (with parent_id) throws
  let attempt = 0;
  const { apiKeyAuth: fallbackAuth } = setupAuth({
    queryHandler: async () => {
      attempt++;
      if (attempt === 1) throw new Error('column parent_id does not exist');
      return { rows: [{ id: indukId }, { id: subId }] };
    }
  });
  const fallbackIds = await fallbackAuth.getAccessibleOpdIds(indukId, '216000000000000');
  assert.deepEqual(fallbackIds, [indukId, subId]);
});

test('canAccessOpd and resolveScopedOpdIds enforce admin vs operator OPD scoping', async () => {
  const { apiKeyAuth } = setupAuth({
    queryHandler: async () => ({ rows: [{ id: 'OPD-A' }, { id: 'OPD-A1' }] })
  });

  const admin = { role: 'admin' };
  const operator = { role: 'operator', opd_id: 'OPD-A', accessible_opd_ids: ['OPD-A', 'OPD-A1'] };
  const unlinked = { role: 'operator', opd_id: null, accessible_opd_ids: [] };

  assert.equal(apiKeyAuth.canAccessOpd(null, 'OPD-A'), false);
  assert.equal(apiKeyAuth.canAccessOpd(admin, 'OPD-X'), true);
  assert.equal(apiKeyAuth.canAccessOpd(operator, null), false);
  assert.equal(apiKeyAuth.canAccessOpd(operator, 'OPD-A1'), true);
  assert.equal(apiKeyAuth.canAccessOpd(operator, 'OPD-B'), false);

  assert.deepEqual(await apiKeyAuth.resolveScopedOpdIds(null), []);
  assert.equal(await apiKeyAuth.resolveScopedOpdIds(admin, null), null);
  assert.deepEqual(await apiKeyAuth.resolveScopedOpdIds(admin, 'OPD-A'), ['OPD-A', 'OPD-A1']);
  assert.deepEqual(await apiKeyAuth.resolveScopedOpdIds(operator, null), ['OPD-A', 'OPD-A1']);
  assert.deepEqual(await apiKeyAuth.resolveScopedOpdIds(operator, 'OPD-A1'), ['OPD-A1']);
  assert.deepEqual(await apiKeyAuth.resolveScopedOpdIds(operator, 'OPD-B'), []);
  assert.deepEqual(await apiKeyAuth.resolveScopedOpdIds(unlinked, null), []);
});

test('requirePermission and requireRole enforce auth, admin/wildcard bypass, OR/AND modes, and 403', () => {
  const { requireRoleMod } = setupAuth();
  const { requirePermission, requireRole } = requireRoleMod;

  // Unauthenticated -> 401
  const res401 = createRes();
  requirePermission('devices:read')({}, res401, () => {});
  assert.equal(res401.statusCode, 401);

  const resRole401 = createRes();
  requireRole(['operator'])({}, resRole401, () => {});
  assert.equal(resRole401.statusCode, 401);

  // Admin & wildcard bypass
  let passed = false;
  requirePermission(['a', 'b'], { requireAll: true })({ user: { role: 'admin', permissions: [] } }, createRes(), () => { passed = true; });
  assert.equal(passed, true);

  passed = false;
  requirePermission('x:y')({ user: { role: 'custom', permissions: ['*'] } }, createRes(), () => { passed = true; });
  assert.equal(passed, true);

  // OR mode vs AND mode
  passed = false;
  requirePermission(['p1', 'p2'])({ user: { role: 'op', permissions: ['p2'] } }, createRes(), () => { passed = true; });
  assert.equal(passed, true);

  const res403 = createRes();
  requirePermission(['p1', 'p2'], { requireAll: true })({ user: { role: 'op', permissions: ['p2'] } }, res403, () => {});
  assert.equal(res403.statusCode, 403);

  // requireRole
  passed = false;
  requireRole(['operator', 'viewer'])({ user: { role: 'viewer' } }, createRes(), () => { passed = true; });
  assert.equal(passed, true);

  const resRole403 = createRes();
  requireRole(['operator'])({ user: { role: 'viewer' } }, resRole403, () => {});
  assert.equal(resRole403.statusCode, 403);
});
