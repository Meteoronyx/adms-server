#!/usr/bin/env node
'use strict';

/**
 * Script Sementara untuk Mengantrekan Perintah INFO ke Mesin Absen
 *
 * Penggunaan:
 *   node scripts/queue-info.js                  # Queue INFO ke semua mesin terverifikasi
 *   node scripts/queue-info.js --sn SN_DEVICE_001  # Queue INFO ke 1 mesin tertentu
 *   node scripts/queue-info.js --dry-run        # Simulasi tanpa menulis ke database
 *   node scripts/queue-info.js --auto-clear     # Sertakan { autoClearCheck: true }
 */

require('dotenv').config();
const config = require('../src/config');
const queries = require('../src/db/queries');
const commandService = require('../src/services/commandService');
const db = require('../src/db/connection');

function parseArgs(argv) {
  const opts = {
    sn: null,
    dryRun: false,
    autoClear: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sn' && argv[i + 1]) {
      opts.sn = argv[++i].trim();
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--auto-clear') {
      opts.autoClear = true;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const targets = opts.sn ? [opts.sn] : await queries.getVerifiedDeviceSns();

  if (targets.length === 0) {
    console.log('Tidak ada perangkat target yang ditemukan.');
    return;
  }

  const params = opts.autoClear ? { autoClearCheck: true } : {};
  let queued = 0;
  let skipped = 0;

  console.log(`Target: ${targets.length} perangkat | dryRun=${opts.dryRun} | autoClear=${opts.autoClear}`);

  for (const sn of targets) {
    const hasPending = await queries.hasPendingCommand(sn, config.COMMAND_TYPES.INFO);
    if (hasPending) {
      console.log(`- [SKIP] ${sn}: sudah ada command INFO pending`);
      skipped++;
      continue;
    }

    if (opts.dryRun) {
      console.log(`- [DRY-RUN] ${sn}: akan queue INFO`, params);
      queued++;
      continue;
    }

    const cmd = await commandService.queueCommand(sn, config.COMMAND_TYPES.INFO, params);
    console.log(`- [QUEUED] ${sn}: command ID=${cmd.id}`);
    queued++;
  }

  console.log(`Selesai: queued=${queued}, skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error('Gagal menjalankan script queue-info:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });
