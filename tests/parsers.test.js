'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const parsers = require('../src/utils/parsers');

test('parseAttendanceLogs parses multi-line TSV, converts checkTime to ISO, and skips invalid lines', () => {
  assert.deepEqual(parsers.parseAttendanceLogs(null), []);
  assert.deepEqual(parsers.parseAttendanceLogs(12345), []);
  assert.deepEqual(parsers.parseAttendanceLogs(''), []);

  const raw = [
    '',
    'incomplete\t2026-11-27 08:00:00',
    '101\t2026-11-27 07:45:12\t0\t1\t0\t0',
    '   ',
    '202\t2026-11-27 16:30:05\t1\t15\t0\t0'
  ].join('\n');

  assert.deepEqual(parsers.parseAttendanceLogs(raw), [
    { userPin: '101', checkTime: '2026-11-27T07:45:12', status: 0, verifyMode: 1 },
    { userPin: '202', checkTime: '2026-11-27T16:30:05', status: 1, verifyMode: 15 }
  ]);
});

test('parseDeviceInfo parses & and newline payloads, strips ~ prefix, and maps known keys', () => {
  assert.deepEqual(parsers.parseDeviceInfo(null), {});

  const raw = Buffer.from(
    '~DeviceName=Lobby 1\r\nMAC=00:17:61:11:22:33&UserCount=120&TransactionCount=500&MainTime=2026-11-27 10:00:00&Platform=ZMM220&FWVersion=Ver 8.0&IPAddress=10.0.0.5&CustomKey=abc'
  );

  assert.deepEqual(parsers.parseDeviceInfo(raw), {
    deviceName: 'Lobby 1',
    mac: '00:17:61:11:22:33',
    userCount: '120',
    transactionCount: '500',
    mainTime: '2026-11-27 10:00:00',
    platform: 'ZMM220',
    fwVersion: 'Ver 8.0',
    ipAddress: '10.0.0.5',
    CustomKey: 'abc'
  });
});

test('parseUserData parses USER lines, applies defaults, and ignores non-USER or PIN-less lines', () => {
  assert.deepEqual(parsers.parseUserData(null), []);

  const raw = [
    'OPLOG 1',
    'USER Name=No Pin\tPri=0',
    'USER PIN=336\tName=RACHMAT\tPri=14\tPasswd=1234\tCard=9988\tGrp=2\tTZ=00000001\tVerify=4',
    'USER PIN=337\tName=BUDI'
  ].join('\n');

  assert.deepEqual(parsers.parseUserData(raw), [
    {
      pin: '336',
      name: 'RACHMAT',
      privilege: 14,
      password: '1234',
      card: '9988',
      groupNo: 2,
      timezone: '00000001',
      verifyMode: 4
    },
    {
      pin: '337',
      name: 'BUDI',
      privilege: 0,
      password: '',
      card: '',
      groupNo: 1,
      timezone: '',
      verifyMode: 0
    }
  ]);
});

test('parseFingerprintData parses FP lines and skips incomplete entries', () => {
  assert.deepEqual(parsers.parseFingerprintData(undefined), []);

  const raw = [
    'USER PIN=66\tName=ADI',
    'FP PIN=66\tFID=6\tSize=1656\tValid=1',
    'FP PIN=66\tFID=6\tSize=1656\tValid=1\tTMP=abc123=='
  ].join('\n');

  assert.deepEqual(parsers.parseFingerprintData(raw), [
    { pin: '66', fingerId: 6, template: 'abc123==' }
  ]);
});

test('parseFaceData parses FACE space/tab prefixes with case-insensitive keys and defaults', () => {
  assert.deepEqual(parsers.parseFaceData(''), []);

  const raw = [
    'FACE PIN=101\tFID=0\tValid=1\tSIZE=1214\tTMP=face0==',
    'FACE\tPIN=102\tFID=11\tTMP=face11==',
    'FACE PIN=103\tFID=1'
  ].join('\n');

  assert.deepEqual(parsers.parseFaceData(raw), [
    { pin: '101', faceId: 0, size: 1214, valid: 1, template: 'face0==' },
    { pin: '102', faceId: 11, size: 1214, valid: 1, template: 'face11==' }
  ]);
});

test('parsePhotoTimestamp handles compact 14-digit, standard datetime, and invalid fallback', () => {
  const compact = parsers.parsePhotoTimestamp('20261014080509');
  assert.equal(compact.getFullYear(), 2026);
  assert.equal(compact.getMonth(), 9);
  assert.equal(compact.getDate(), 14);
  assert.equal(compact.getHours(), 8);
  assert.equal(compact.getMinutes(), 5);
  assert.equal(compact.getSeconds(), 9);

  const standard = parsers.parsePhotoTimestamp('2026-10-14 08:05:09');
  assert.equal(standard.getFullYear(), 2026);
  assert.equal(standard.getMinutes(), 5);

  const fallback = parsers.parsePhotoTimestamp('not-a-date');
  assert.ok(fallback instanceof Date && !Number.isNaN(fallback.getTime()));
});

test('parseAttendancePhotoStream handles \\r\\n\\r\\n, \\n\\n, \\0, and JPEG SOI fallback across PIN patterns', () => {
  assert.equal(parsers.parseAttendancePhotoStream(null), null);
  assert.equal(parsers.parseAttendancePhotoStream(Buffer.alloc(0)), null);
  assert.equal(parsers.parseAttendancePhotoStream(Buffer.from('SN=ABC\r\n\r\n')), null);

  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x10]);

  // 1. \r\n\r\n + YYYYMMDDHHmmss-PIN.jpg
  const bufCrlf = Buffer.concat([
    Buffer.from('PIN=20261014080000-12064.jpg\tSN=DEV1\tsize=6\r\n\r\n'),
    jpegBytes
  ]);
  const res1 = parsers.parseAttendancePhotoStream(bufCrlf);
  assert.equal(res1.pin, '12064');
  assert.equal(res1.sn, 'DEV1');
  assert.equal(res1.photoTimeStr, '20261014080000');
  assert.deepEqual(res1.jpegBuffer, jpegBytes);

  // 2. \n\n + PIN_YYYYMMDDHHmmss.jpg
  const bufLf = Buffer.concat([
    Buffer.from('PIN=8899_20261014091530.jpeg&SN=DEV2\n\n'),
    jpegBytes
  ]);
  const res2 = parsers.parseAttendancePhotoStream(bufLf);
  assert.equal(res2.pin, '8899');
  assert.equal(res2.sn, 'DEV2');
  assert.equal(res2.photoTimeStr, '20261014091530');

  // 3. \0 delimiter with trailing \r\n + 0-PIN.jpg
  const bufNull = Buffer.concat([
    Buffer.from('PIN=0-5501.jpg\tSN=DEV3'),
    Buffer.from([0x00, 0x0d, 0x0a]),
    jpegBytes
  ]);
  const res3 = parsers.parseAttendancePhotoStream(bufNull);
  assert.equal(res3.pin, '5501');
  assert.equal(res3.sn, 'DEV3');
  assert.deepEqual(res3.jpegBuffer, jpegBytes);

  // 4. Fallback JPEG SOI marker without explicit delimiter
  const bufFallback = Buffer.concat([
    Buffer.from('PIN=777&SN=DEV4 '),
    jpegBytes
  ]);
  const res4 = parsers.parseAttendancePhotoStream(bufFallback);
  assert.equal(res4.pin, '777');
  assert.deepEqual(res4.jpegBuffer, jpegBytes);

  // 5. Missing PIN returns null
  const bufNoPin = Buffer.concat([Buffer.from('SN=DEV5\r\n\r\n'), jpegBytes]);
  assert.equal(parsers.parseAttendancePhotoStream(bufNoPin), null);
});

test('parseAttendancePhotoBase64 parses ATTPHOTO base64 payloads and strips data URI prefix', () => {
  assert.deepEqual(parsers.parseAttendancePhotoBase64(null), []);

  const payload = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
  const raw = [
    '',
    `ATTPHOTO pin=20261014080000-12064.jpg\tsn=SN-TEST-001\tsize=4\tphoto=data:image/jpeg;base64,${payload}`,
    'pin=999'
  ].join('\n');

  const photos = parsers.parseAttendancePhotoBase64(raw);
  assert.equal(photos.length, 1);
  assert.equal(photos[0].pin, '12064');
  assert.equal(photos[0].sn, 'SN-TEST-001');
  assert.equal(photos[0].photoTimeStr, '20261014080000');
  assert.deepEqual(photos[0].jpegBuffer, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
});

test('parseCommandResults parses ~ID= and Content= in ampersand format', () => {
  const parsed = parsers.parseCommandResults('~ID=42&Return=0&CMD=INFO&Content=ok');
  assert.deepEqual(parsed, [{ id: 42, returnValue: 0, content: 'ok' }]);
});
