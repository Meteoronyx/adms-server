'use strict';

const queries = require('../db/queries');
const logger = require('../utils/logger');
const parsers = require('../utils/parsers');

const handleOperlog = async (deviceSN, rawBody) => {

  const users = parsers.parseUserData(rawBody);
  const fingerprints = parsers.parseFingerprintData(rawBody);

  const deviceInfo = await queries.getDeviceInfo(deviceSN);
  const deviceName = deviceInfo?.device_name || null;

  // Sync users if any
  if (users.length > 0) {
    logger.info('Syncing pegawai from device', {
      sn: deviceSN,
      user_count: users.length
    });
    await syncPegawai(deviceSN, deviceName, users);
  }

  // Sync fingerprints if any
  if (fingerprints.length > 0) {
    logger.info('Syncing fingerprints from device', {
      sn: deviceSN,
      fingerprint_count: fingerprints.length
    });
    await syncFingerprints(deviceSN, fingerprints);
  }
};


const syncPegawai = async (deviceSN, deviceName, users) => {
  for (const user of users) {
    try {
      // Upsert pegawai
      await queries.upsertPegawai(user);
      
      // Upsert device mapping
      await queries.upsertPegawaiDeviceMapping(user.pin, deviceSN, deviceName);
    } catch (err) {
      logger.error('Failed to sync pegawai', {
        pin: user.pin,
        sn: deviceSN,
        error: err.message
      });
    }
  }
};


const syncFingerprints = async (deviceSN, fingerprints) => {
  for (const fp of fingerprints) {
    try {
      // Ensure pegawai exists in mapping (in case FP comes before USER)
      await queries.ensurePegawaiDeviceMapping(fp.pin, deviceSN);
      
      // Upsert fingerprint
      await queries.upsertFingerprint(fp.pin, deviceSN, fp.fingerId, fp.template);
    } catch (err) {
      logger.error('Failed to sync fingerprint', {
        pin: fp.pin,
        finger_id: fp.fingerId,
        sn: deviceSN,
        error: err.message
      });
    }
  }
};

/**
 * Get pegawai with all fingerprint info across devices
 */
const getPegawaiWithFingerprints = async (pin) => {
  return queries.getPegawaiWithFingerprints(pin);
};

/**
 * Get all pegawai at a specific device
 */
const getPegawaiByDevice = async (deviceSN) => {
  return queries.getPegawaiByDevice(deviceSN);
};


/**
 * Check fingerprints stored on a specific device
 */
const checkFingerprintOnDevice = async (pin, deviceSN) => {
  return queries.getPegawaiFingerprints(pin, deviceSN);
};

module.exports = {
  handleOperlog,
  syncPegawai,
  syncFingerprints,
  getPegawaiWithFingerprints,
  getPegawaiByDevice,
  checkFingerprintOnDevice,
};
