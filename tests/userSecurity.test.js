'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');

const root = path.resolve(__dirname, '..');

// Helper to load userController with mocked DB queries and auth helpers
function setupUserController({ queryHandler = async () => ({ rows: [] }) } = {}) {
  const queriesExecuted = [];

  const mockQuery = async (sql, params) => {
    queriesExecuted.push({ sql, params });
    return queryHandler(sql, params);
  };

  const doubles = {
    bcrypt: {
      hash: async (pwd) => `hashed_${pwd}`,
      compare: async (pwd, hash) => hash === `hashed_${pwd}`
    },
    'src/db/connection': {
      query: mockQuery
    },
    'src/utils/logger': {
      info() {},
      error() {},
      warn() {}
    },
    'src/middleware/apiKeyAuth': {
      canAccessOpd: (user, targetOpdId) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (!targetOpdId) return false;
        if (Array.isArray(user.accessible_opd_ids) && user.accessible_opd_ids.length > 0) {
          return user.accessible_opd_ids.includes(targetOpdId);
        }
        return Boolean(user.opd_id && user.opd_id === targetOpdId);
      },
      resolveScopedOpdIds: async (user) => {
        if (!user) return [];
        if (user.role === 'admin') return null;
        return Array.isArray(user.accessible_opd_ids) && user.accessible_opd_ids.length > 0
          ? user.accessible_opd_ids
          : (user.opd_id ? [user.opd_id] : []);
      }
    }
  };

  const filename = path.resolve(root, 'src/controllers/userController.js');
  const module = { exports: {} };
  const localRequire = (id) => {
    const key = id.startsWith('.')
      ? path.relative(root, path.resolve(path.dirname(filename), id)).replace(/\\/g, '/')
      : id;
    if (Object.hasOwn(doubles, key)) return doubles[key];
    throw new Error(`Unexpected require: ${id} (${key})`);
  };

  const wrapper = vm.runInThisContext(
    `(function(require, module, exports) {\n${readFileSync(filename, 'utf8')}\n})`,
    { filename }
  );
  wrapper(localRequire, module, module.exports);

  return {
    controller: module.exports,
    queriesExecuted
  };
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  return res;
}

const OPD_A = '11111111-1111-1111-1111-111111111111';
const OPD_B = '22222222-2222-2222-2222-222222222222';

test('userController security: createUser blocks privilege escalation to admin by non-admin', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM roles WHERE slug = $1')) {
        return { rows: [{ id: 'role-admin-id', name: 'Administrator', slug: 'admin' }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    body: {
      username: 'evil_operator',
      password: 'password123',
      name: 'Evil Operator',
      role: 'admin'
    },
    user: {
      id: 'user-op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A
    }
  };
  const res = mockResponse();

  await controller.createUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Hanya Administrator/i);
});

test('userController security: createUser blocks non-admin from creating user in another OPD', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM roles WHERE slug = $1')) {
        return { rows: [{ id: 'role-op-id', name: 'Operator', slug: 'operator' }] };
      }
      if (sql.includes('FROM opds WHERE id = $1')) {
        return { rows: [{ id: OPD_B, nama_opd: 'Dinas B', kdunker: '1.02' }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    body: {
      username: 'op_foreign',
      password: 'password123',
      name: 'Foreign Op',
      role: 'operator',
      opd_id: OPD_B // OPD B is outside OPD A
    },
    user: {
      id: 'user-op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.createUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /unit kerja/i);
});

test('userController security: createUser allows global admin to create admin without OPD', async () => {
  const { controller, queriesExecuted } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM roles WHERE slug = $1')) {
        return { rows: [{ id: 'role-admin-id', name: 'Administrator', slug: 'admin' }] };
      }
      if (sql.includes('FROM users WHERE username = $1')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO users')) {
        return {
          rows: [{
            id: 'new-admin-id',
            username: params[0],
            name: params[2],
            role: params[3],
            role_id: params[4],
            opd_id: params[5],
            is_active: true
          }]
        };
      }
      return { rows: [] };
    }
  });

  const req = {
    body: {
      username: 'legit_admin',
      password: 'password123',
      name: 'Legit Admin',
      role: 'admin'
    },
    user: {
      id: 'superadmin-id',
      username: 'superadmin',
      role: 'admin'
    }
  };
  const res = mockResponse();

  await controller.createUser(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.role, 'admin');
});

test('userController security: updateUser blocks non-admin from modifying an admin account', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'target-admin-id', username: 'admin', role: 'admin', opd_id: null }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'target-admin-id' },
    body: { name: 'Compromised Admin Name' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A
    }
  };
  const res = mockResponse();

  await controller.updateUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Hanya Administrator/i);
});

test('userController security: updateUser blocks non-admin from modifying user in another OPD', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'user-in-opd-b', username: 'user_b', role: 'operator', opd_id: OPD_B }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'user-in-opd-b' },
    body: { name: 'Hacked User B' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.updateUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /unit kerja/i);
});

test('userController security: updateUser blocks non-admin from promoting a user to admin role', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'user-in-opd-a', username: 'user_a', role: 'operator', opd_id: OPD_A }] };
      }
      if (sql.includes('FROM roles WHERE slug = $1')) {
        return { rows: [{ id: 'role-admin-id', name: 'Administrator', slug: 'admin' }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'user-in-opd-a' },
    body: { role: 'admin' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.updateUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Hanya Administrator/i);
});

test('userController security: updateUser blocks non-admin from moving user to another OPD', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'user-in-opd-a', username: 'user_a', role: 'operator', opd_id: OPD_A }] };
      }
      if (sql.includes('FROM opds WHERE id = $1')) {
        return { rows: [{ id: OPD_B }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'user-in-opd-a' },
    body: { opd_id: OPD_B },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.updateUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /memindahkan pengguna/i);
});

test('userController security: changePassword blocks non-admin from resetting admin password', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'target-admin-id', username: 'admin', role: 'admin', opd_id: null }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'target-admin-id' },
    body: { newPassword: 'newPassword123' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A
    }
  };
  const res = mockResponse();

  await controller.changePassword(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Hanya Administrator/i);
});

test('userController security: changePassword blocks non-admin from resetting password of user in another OPD', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'user-in-opd-b', username: 'user_b', role: 'operator', opd_id: OPD_B }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'user-in-opd-b' },
    body: { newPassword: 'newPassword123' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.changePassword(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /unit kerja/i);
});

test('userController security: deleteUser blocks non-admin from deleting admin account', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'target-admin-id', username: 'admin', role: 'admin', opd_id: null }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'target-admin-id' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A
    }
  };
  const res = mockResponse();

  await controller.deleteUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Hanya Administrator/i);
});

test('userController security: deleteUser blocks non-admin from deleting user in another OPD', async () => {
  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      if (sql.includes('FROM users WHERE id = $1')) {
        return { rows: [{ id: 'user-in-opd-b', username: 'user_b', role: 'operator', opd_id: OPD_B }] };
      }
      return { rows: [] };
    }
  });

  const req = {
    params: { id: 'user-in-opd-b' },
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.deleteUser(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /unit kerja/i);
});

test('userController security: listUsers scopes to accessible OPD and excludes admin accounts for non-admin', async () => {
  let capturedSql = null;
  let capturedParams = null;

  const { controller } = setupUserController({
    queryHandler: async (sql, params) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [
          { id: 'user-1', username: 'op_a', role: 'operator', opd_id: OPD_A }
        ]
      };
    }
  });

  const req = {
    user: {
      id: 'op-1',
      username: 'operator1',
      role: 'operator',
      opd_id: OPD_A,
      accessible_opd_ids: [OPD_A]
    }
  };
  const res = mockResponse();

  await controller.listUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(capturedSql.includes('u.opd_id = ANY($1::uuid[])'));
  assert.ok(capturedSql.includes("COALESCE(r.slug, u.role) != 'admin'"));
  assert.deepEqual(capturedParams[0], [OPD_A]);
});

test('userController security: listUsers returns empty without querying if non-admin has no accessible OPD', async () => {
  let queryCalled = false;

  const { controller } = setupUserController({
    queryHandler: async () => {
      queryCalled = true;
      return { rows: [] };
    }
  });

  const req = {
    user: {
      id: 'op-unassigned',
      username: 'unassigned',
      role: 'operator',
      opd_id: null,
      accessible_opd_ids: []
    }
  };
  const res = mockResponse();

  await controller.listUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, []);
  assert.equal(queryCalled, false);
});
