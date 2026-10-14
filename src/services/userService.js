'use strict';

const queries = require('../db/queries');
const logger = require('../utils/logger');
const parsers = require('../utils/parsers');

const handleOperlog = async (deviceSN, rawBody) => {

  const users = parsers.parseUserData(rawBody);
  const fingerprints = parsers.parseFingerprintData(rawBody);
  const faces = parsers.parseFaceData(rawBody);

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

  // Sync faces if any
  if (faces.length > 0) {
    logger.info('Syncing faces from device', {
      sn: deviceSN,
      face_count: faces.length
    });
    await syncFaces(deviceSN, faces);
  }
};


const syncPegawai = async (deviceSN, deviceName, users) => {
  for (const user of users) {
    try {
      // Upsert pegawai
      await queries.upsertPegawai(user);
      
      // Upsert device mapping
      await queries.upsertPegawaiDeviceMapping(user.pin, deviceSN, deviceName, user.privilege, user.password);
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

const syncFaces = async (deviceSN, faces) => {
  for (const face of faces) {
    try {
      // Ensure pegawai exists in mapping (in case FACE comes before USER)
      await queries.ensurePegawaiDeviceMapping(face.pin, deviceSN);

      // Upsert face template
      await queries.upsertFace(face.pin, deviceSN, face.faceId, face.size, face.valid, face.template);
    } catch (err) {
      logger.error('Failed to sync face', {
        pin: face.pin,
        face_id: face.faceId,
        sn: deviceSN,
        error: err.message
      });
    }
  }
};

/**
 * Get pegawai with all fingerprint info across devices
 */
const getPegawaiWithFingerprints = async (pin, opdId = null) => {
  return queries.getPegawaiWithFingerprints(pin, opdId);
};

/**
 * Get all pegawai at a specific device
 */
const getPegawaiByDevice = async (deviceSN, limit = null, offset = null, search = null) => {
  return queries.getPegawaiByDevice(deviceSN, limit, offset, search);
};


/**
 * Check fingerprints stored on a specific device
 */
const checkFingerprintOnDevice = async (pin, deviceSN) => {
  return queries.getPegawaiFingerprints(pin, deviceSN);
};

/**
 * Check face templates stored on a specific device
 */
const checkFaceOnDevice = async (pin, deviceSN) => {
  return queries.getPegawaiFaces(pin, deviceSN);
};

module.exports = {
  handleOperlog,
  syncPegawai,
  syncFingerprints,
  syncFaces,
  getPegawaiWithFingerprints,
  getPegawaiByDevice,
  checkFingerprintOnDevice,
  checkFaceOnDevice,
};
