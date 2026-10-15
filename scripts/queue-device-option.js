#!/usr/bin/env node
'use strict';

/**
 * Script Antrean Konfigurasi Opsi Perangkat via Protokol ADMS
 *
 * Contoh penggunaan:
 *   node scripts/queue-device-option.js --sn AEYU182060296
 *   node scripts/queue-device-option.js --sn AEYU182060296 --option CapturePic=4 --reboot
 *   node scripts/queue-device-option.js --sn AEYU182060296 --option CapturePic=2 --no-reboot
 *   node scripts/queue-device-option.js --all --option CapturePic=4 --reboot
 */

require('dotenv').config();
const config = require('../src/config');
const commandService = require('../src/services/commandService');
const db = require('../src/db/connection');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    sn: null,
    all: false,
    option: 'CapturePic=4',
    reboot: true,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--sn' || arg === '-s') {
      parsed.sn = args[++i];
    } else if (arg === '--all') {
      parsed.all = true;
    } else if (arg === '--option' || arg === '-o') {
      parsed.option = args[++i];
    } else if (arg === '--no-reboot') {
      parsed.reboot = false;
    } else if (arg === '--reboot') {
      parsed.reboot = true;
    } else if (!arg.startsWith('-') && !parsed.sn) {
      parsed.sn = arg;
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
Penggunaan:
  node scripts/queue-device-option.js [opsi]

Opsi:
  --sn, -s <SN>          Serial Number perangkat target (wajib jika tidak pakai --all)
  --all                  Antrekan perintah ke semua perangkat yang terdaftar di database
  --option, -o <K=V>     Nama dan nilai opsi yang ingin disetel (default: CapturePic=4)
  --reboot               Antrekan REBOOT setelah SET OPTION (default: true)
  --no-reboot            Jangan antrekan perintah REBOOT
  --help, -h             Tampilkan pesan bantuan ini

Contoh:
  node scripts/queue-device-option.js --sn AEYU182060296 --option CapturePic=4 --reboot
  node scripts/queue-device-option.js --all --option CapturePic=4 --reboot
`);
}

async function main() {
  const { sn, all, option, reboot, help } = parseArgs();

  if (help || (!sn && !all)) {
    showHelp();
    process.exit(help ? 0 : 1);
  }

  const [optKey, optVal] = (option || '').split('=');
  if (!optKey || optVal === undefined) {
    console.error('Error: Format opsi tidak valid. Gunakan format Nama=Nilai (contoh: CapturePic=4)');
    process.exit(1);
  }

  try {
    let targetSns = [];

    if (all) {
      const res = await db.query('SELECT sn, name, ip_address FROM devices WHERE verified = TRUE');
      if (res.rows.length === 0) {
        console.warn('Tidak ada perangkat terverifikasi yang ditemukan di database.');
        process.exit(0);
      }
      targetSns = res.rows.map(r => r.sn);
      console.log(`Menyiapkan perintah untuk ${targetSns.length} perangkat terverifikasi...`);
    } else {
      const res = await db.query('SELECT sn, name, ip_address, verified FROM devices WHERE sn = $1', [sn]);
      if (res.rows.length === 0) {
        console.warn(`Peringatan: Perangkat dengan SN "${sn}" belum terdaftar di tabel devices.`);
      }
      targetSns = [sn];
    }

    console.log('------------------------------------------------------------');
    console.log(`Pengaturan Opsi ADMS: ${optKey} = ${optVal}`);
    console.log(`Reboot setelah set option: ${reboot ? 'YA' : 'TIDAK'}`);
    console.log('------------------------------------------------------------');

    for (const targetSn of targetSns) {
      // 1. Antrekan SET OPTION
      const setCmd = await commandService.queueCommand(targetSn, config.COMMAND_TYPES.SET_OPTION, {
        name: optKey.trim(),
        value: optVal.trim()
      });
      console.log(`[${targetSn}] [OK] SET OPTION diantrekan -> ID Command: ${setCmd.id}`);

      // 2. Antrekan REBOOT jika diminta
      if (reboot) {
        const rebootCmd = await commandService.queueCommand(targetSn, config.COMMAND_TYPES.REBOOT, {});
        console.log(`[${targetSn}] [OK] REBOOT diantrekan -> ID Command: ${rebootCmd.id}`);
      }
    }

    console.log('------------------------------------------------------------');
    console.log('Semua perintah berhasil masuk antrean database (tabel device_commands).');
    console.log('Mesin absensi akan mengambil dan mengeksekusi perintah ini secara otomatis');
    console.log('saat melakukan heartbeat (GET /iclock/getrequest) ke server.');
    console.log('------------------------------------------------------------');
  } catch (err) {
    console.error('Gagal mengantrekan perintah:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();
