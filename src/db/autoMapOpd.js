'use strict';
require('dotenv').config();

const { query } = require('./connection');
const logger = require('../utils/logger');

/**
 * Normalizes string for matching OPD names
 */
function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/^uptd\s+/, '')
    .replace(/^upt\s+/, '')
    .replace(/\s*-\s*.*$/, '') // strip suffix after dash e.g. " - JJ 3"
    .replace(/\s*\(.*?\)\s*/g, '') // strip brackets e.g. " (Mesin 2)"
    .trim();
}

async function autoMapOpdData() {
  logger.info('Mulai proses auto-mapping OPD untuk data eksisting (devices, users, pegawai)...');

  // 1. Fetch OPDs
  const opdsRes = await query('SELECT id, kdunker, nama_opd FROM opds WHERE deleted_at IS NULL');
  const opds = opdsRes.rows;

  if (opds.length === 0) {
    logger.warn('Tabel opds kosong. Silakan jalankan seedOpds terlebih dahulu.');
    return { mappedDevices: 0, mappedUsers: 0, mappedPegawai: 0 };
  }

  const ALIASES = [
    { pattern: /bpbd/i, target: 'Badan Penanggulangan Bencana Daerah' },
    { pattern: /rsud\s+kabupaten\s+tangerang/i, target: 'RSUD Kabupaten Tangerang' },
    { pattern: /rsud\s+balaraja/i, target: 'RSUD Balaraja' },
    { pattern: /rsud\s+pakuhaji/i, target: 'RSUD Pakuhaji' },
    { pattern: /rsud\s+tigaraksa/i, target: 'RSUD Tigaraksa' },
    { pattern: /dinas\s+perkim/i, target: 'Dinas Perumahan, Permukiman dan Pemakaman' }
  ];

  function cleanStr(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/uptd\s*/g, '')
      .replace(/upt\s*/g, '')
      .replace(/puskesmas\s*/g, '')
      .replace(/\s*-\s*.*$/, '')
      .replace(/\s*\d+$/, '')
      .replace(/\s+/g, '')
      .trim();
  }

  // Helper function to find best OPD match
  function findBestOpd(nameStr) {
    if (!nameStr) return null;

    // 1. Check alias rules first
    for (const alias of ALIASES) {
      if (alias.pattern.test(nameStr)) {
        const match = opds.find(o => o.nama_opd.toLowerCase().includes(alias.target.toLowerCase()) || alias.target.toLowerCase().includes(o.nama_opd.toLowerCase()));
        if (match) return match;
      }
    }

    // 2. Direct / normalized match
    const norm = normalizeName(nameStr);
    if (norm && norm.length >= 3) {
      let match = opds.find(o => normalizeName(o.nama_opd) === norm);
      if (match) return match;

      match = opds.find(o => {
        const oNorm = normalizeName(o.nama_opd);
        return (oNorm.length >= 3 && norm.length >= 3) && (oNorm.includes(norm) || norm.includes(oNorm));
      });
      if (match) return match;
    }

    // 3. Space-insensitive clean string matching (handles Teluk Naga vs Teluknaga, etc.)
    const cName = cleanStr(nameStr);
    if (cName.length >= 3) {
      const match = opds.find(o => {
        const oClean = cleanStr(o.nama_opd);
        return oClean.length >= 3 && (oClean.includes(cName) || cName.includes(oClean));
      });
      if (match) return match;
    }

    return null;
  }

  // 2. Auto-map Devices
  const devicesRes = await query('SELECT sn, name, device_name FROM devices WHERE opd_id IS NULL');
  let mappedDevices = 0;

  for (const d of devicesRes.rows) {
    const nameToTest = d.device_name || d.name || '';
    const matchedOpd = findBestOpd(nameToTest);

    if (matchedOpd) {
      await query('UPDATE devices SET opd_id = $1 WHERE sn = $2', [matchedOpd.id, d.sn]);
      mappedDevices++;
      logger.info(`Device '${nameToTest}' (${d.sn}) auto-mapped to OPD '${matchedOpd.nama_opd}'`);
    }
  }

  // 3. Auto-map Users
  const usersRes = await query('SELECT id, username, name FROM users WHERE opd_id IS NULL AND role != \'admin\'');
  let mappedUsers = 0;

  for (const u of usersRes.rows) {
    const nameToTest = u.name || u.username || '';
    const matchedOpd = findBestOpd(nameToTest);

    if (matchedOpd) {
      await query('UPDATE users SET opd_id = $1 WHERE id = $2', [matchedOpd.id, u.id]);
      mappedUsers++;
      logger.info(`User '${u.username}' (${u.name}) auto-mapped to OPD '${matchedOpd.nama_opd}'`);
    }
  }

  // 4. Auto-map Pegawai (from mapped devices mapping)
  const pegawaiMapRes = await query(`
    UPDATE pegawai p
    SET opd_id = d.opd_id
    FROM pegawai_device_mapping pdm
    JOIN devices d ON pdm.device_sn = d.sn
    WHERE pdm.pegawai_pin = p.pin 
      AND p.opd_id IS NULL 
      AND d.opd_id IS NOT NULL;
  `);
  const mappedPegawai = pegawaiMapRes.rowCount || 0;

  logger.info(`Auto-mapping OPD selesai. Total Device: ${mappedDevices}, Users: ${mappedUsers}, Pegawai: ${mappedPegawai}`);

  return {
    mappedDevices,
    mappedUsers,
    mappedPegawai
  };
}

if (require.main === module) {
  autoMapOpdData()
    .then((res) => {
      console.log('Auto-map OPD execution complete:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Auto-map OPD failed:', err);
      process.exit(1);
    });
}

module.exports = {
  autoMapOpdData
};
