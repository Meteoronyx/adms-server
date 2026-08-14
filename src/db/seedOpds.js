'use strict';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { query } = require('./connection');
const logger = require('../utils/logger');

/**
 * Line CSV parser handling quoted strings and inner commas.
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

async function seedOpdsFromCsv(filePath) {
  const csvPath = filePath || path.join(__dirname, 'data/koordinat_opds_202608130811.csv');

  if (!fs.existsSync(csvPath)) {
    logger.warn(`File CSV OPD tidak ditemukan di: ${csvPath}`);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  if (lines.length <= 1) {
    logger.warn('File CSV OPD kosong atau hanya berisi header.');
    return;
  }

  const rows = lines.slice(1);
  let countInserted = 0;
  let countUpdated = 0;

  for (const line of rows) {
    const cols = parseCsvLine(line);
    if (cols.length < 3) continue;

    const kdunker = cols[1];
    const nama_opd = cols[2];
    const latitude = cols[3] && cols[3] !== '' ? parseFloat(cols[3]) : null;
    const longitude = cols[4] && cols[4] !== '' ? parseFloat(cols[4]) : null;
    const radius = cols[5] && cols[5] !== '' ? parseFloat(cols[5]) : 80.0;
    const ip_public = cols[6] && cols[6] !== '' ? cols[6] : null;
    const created_at = cols[7] && cols[7] !== '' ? new Date(cols[7]) : new Date();
    const updated_at = cols[8] && cols[8] !== '' ? new Date(cols[8]) : new Date();
    const deleted_at = cols[9] && cols[9] !== '' ? new Date(cols[9]) : null;

    if (!kdunker || !nama_opd) continue;

    const res = await query(
      `INSERT INTO opds (kdunker, nama_opd, latitude, longitude, radius, ip_public, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (kdunker) DO UPDATE SET
         nama_opd = EXCLUDED.nama_opd,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         radius = EXCLUDED.radius,
         ip_public = EXCLUDED.ip_public,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at
       RETURNING (xmax = 0) AS inserted;`,
      [
        kdunker,
        nama_opd,
        isNaN(latitude) ? null : latitude,
        isNaN(longitude) ? null : longitude,
        isNaN(radius) ? 80.0 : radius,
        ip_public,
        isNaN(created_at.getTime()) ? new Date() : created_at,
        isNaN(updated_at.getTime()) ? new Date() : updated_at,
        deleted_at && !isNaN(deleted_at.getTime()) ? deleted_at : null
      ]
    );

    if (res.rows[0]?.inserted) {
      countInserted++;
    } else {
      countUpdated++;
    }
  }

  logger.info(`Seeding OPD selesai. Total disisipkan: ${countInserted}, diperbarui: ${countUpdated}`);
  return { countInserted, countUpdated };
}

if (require.main === module) {
  seedOpdsFromCsv()
    .then((res) => {
      console.log('Seeding OPDs completed successfully:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding OPDs failed:', err);
      process.exit(1);
    });
}

module.exports = {
  seedOpdsFromCsv
};
