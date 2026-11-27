'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config');
const commandService = require('../src/services/commandService');
const roleScriptService = require('../src/services/roleScriptService');
const parsers = require('../src/utils/parsers');

test('commandService.buildCommandString builds SHELL staging command <= 78 chars and normalizes scheme', () => {
  const cmd = commandService.buildCommandString({
    id: 12345,
    command_type: config.COMMAND_TYPES.SHELL,
    command_params: {
      serverUrl: 'http://dbspot.meteoronyx.my.id'
    }
  });

  assert.equal(cmd, 'C:12345:SHELL wget -qO /tmp/r.sh http://dbspot.meteoronyx.my.id/r/12345 && sh /tmp/r.sh');
  const payload = cmd.replace(/^C:\d+:SHELL /, '');
  assert.ok(payload.length <= 78, `Expected <= 78 chars, got ${payload.length}`);

  const normalized = commandService.buildCommandString({
    id: 269334,
    command_type: config.COMMAND_TYPES.SHELL,
    command_params: {
      serverUrl: 'dbspot.meteoronyx.my.id/'
    }
  });
  assert.equal(normalized, 'C:269334:SHELL wget -qO /tmp/r.sh http://dbspot.meteoronyx.my.id/r/269334 && sh /tmp/r.sh');
});

test('commandService.buildCommandString returns null when SHELL exceeds 78 chars', () => {
  const cmd = commandService.buildCommandString({
    id: 1,
    command_type: config.COMMAND_TYPES.SHELL,
    command_params: {
      command: 'echo ' + 'a'.repeat(80)
    }
  });
  assert.equal(cmd, null);
});

test('parsers.parseCommandResults parses single-line and multi-line Shell stdout', () => {
  const single = parsers.parseCommandResults('ID=101&Return=0&CMD=SET OPTION\n');
  assert.deepEqual(single, [{ id: 101, returnValue: 0, content: null }]);

  const multi = parsers.parseCommandResults('ID=9102 Return=0 CMD=Shell:\nPROVISION_OK\n');
  assert.deepEqual(multi, [{ id: 9102, returnValue: 0, content: 'PROVISION_OK' }]);

  const withContentParam = parsers.parseCommandResults('ID=55&Return=-1007&CMD=Shell&Content=ERR_TRUNCATED');
  assert.deepEqual(withContentParam, [{ id: 55, returnValue: -1007, content: 'ERR_TRUNCATED' }]);

  const multiLineKeyVal = parsers.parseCommandResults(
    'ID=269341\nSN=TES3235200353\nReturn=0\nCMD=Shell\nFILENAME=shellout.txt\nContent=PROVISION_OK\n'
  );
  assert.deepEqual(multiLineKeyVal, [{ id: 269341, returnValue: 0, content: 'PROVISION_OK' }]);

  const multiLineKeyValNoContent = parsers.parseCommandResults(
    'ID=269342\nSN=TES3235200353\nReturn=-1007\nCMD=Shell\nFILENAME=shellout.txt\nContent=\n'
  );
  assert.deepEqual(multiLineKeyValNoContent, [{ id: 269342, returnValue: -1007, content: null }]);
});

test('roleScriptService.generateScript generates ZKSystem.db COMKey and ZKDB.db Ethernet role SQL', () => {
  const script = roleScriptService.generateScript({
    comKey: '123456',
    roleSlot: 1,
    roleDesc: 'log',
    apps: ['comset'],
    funcs: ['netset']
  });

  assert.match(script, /UPDATE OPTION_INFO SET Option_Value='123456' WHERE Option_Name='COMKey';/);
  assert.match(script, /UPDATE ROLE SET Role_Name='custom1', Description='log', Using_Status=1, Flag=1 WHERE ID=3;/);
  assert.match(script, /INSERT INTO APP_PERMISSION \(App_Name, Permission\) VALUES \('comset', 4\);/);
  assert.match(script, /INSERT INTO FUNC_PERMISSION \(Func_Name, Permission\) VALUES \('netset', 4\);/);
  assert.match(script, /echo "PROVISION_OK"/);
});

test('roleScriptService.generateScript rejects unsafe SQL injection characters', () => {
  assert.throws(() => {
    roleScriptService.generateScript({
      comKey: "123'; DROP TABLE ROLE;--",
      apps: ['comset'],
      funcs: ['netset']
    });
  }, /Invalid COMKey/);

  assert.throws(() => {
    roleScriptService.generateScript({
      roleSlot: 1,
      roleDesc: "log';--",
      apps: ['comset'],
      funcs: ['netset']
    });
  }, /Invalid roleDesc/);
});

test('roleScriptService.validateCommandAvailability enforces status and 15-min TTL', () => {
  const now = new Date('2026-11-17T12:00:00Z');

  assert.equal(
    roleScriptService.validateCommandAvailability(
      { command_type: 'SHELL', status: 'pending', created_at: new Date('2026-11-17T11:55:00Z') },
      now
    ).ok,
    true
  );

  assert.equal(
    roleScriptService.validateCommandAvailability(
      { command_type: 'SHELL', status: 'executed', executed_at: new Date('2026-11-17T11:40:00Z') },
      now
    ).status,
    410
  );

  assert.equal(
    roleScriptService.validateCommandAvailability(
      { command_type: 'SHELL', status: 'success', created_at: now },
      now
    ).status,
    410
  );

  assert.equal(
    roleScriptService.validateCommandAvailability(
      { command_type: 'DATA_USER', status: 'pending', created_at: now },
      now
    ).status,
    404
  );
});
