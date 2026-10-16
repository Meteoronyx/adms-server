#!/usr/bin/env node
'use strict';

/**
 * Script Antrean Konfigurasi Opsi Perangkat via Protokol ADMS
 *
 * File ini menyediakan konfigurasi dinamis yang dapat diubah langsung di bawah,
 * maupun melalui parameter/argumen CLI.
 *
 * Contoh penggunaan cepat:
 *   # 1. Jalankan sesuai konfigurasi default di bawah (otomatis matikan foto & reboot semua mesin):
 *   node scripts/queue-device-option.js
 *
 *   # 2. Preset Cepat:
 *   node scripts/queue-device-option.js --disable-photo --all
 *   node scripts/queue-device-option.js --enable-photo --sn AEYU182060296
 *
 *   # 3. Opsi kustom dinamis (bisa multiple opsi sekaligus):
 *   node scripts/queue-device-option.js --sn AEYU182060296 --option CapturePic=0 --reboot
 *   node scripts/queue-device-option.js --all -o CapturePic=0 -o TransFlag=110111111111
 *
 *   # 4. Cek daftar mesin & antrean command:
 *   node scripts/queue-device-option.js --list
 */

require('dotenv').config();
const config = require('../src/config');
const commandService = require('../src/services/commandService');
const db = require('../src/db/connection');

// =============================================================================
// [KONFIGURASI DINAMIS] - Silakan sesuaikan pengaturan di bawah ini
// =============================================================================
const DEVICE_OPTION_CONFIG = {
  // Target perangkat:
  // - 'ALL' : Terapkan ke semua mesin fisik terverifikasi di database
  // - '<SN>' : Serial number mesin tertentu (contoh: 'AEYU182060296')
  target: 'ALL',

  // Preset aktif default saat dijalankan tanpa argumen:
  // Pilihan: 'disable-photo' | 'enable-photo' | 'pic-off' | 'pic-on' | 'custom'
  activePreset: 'disable-photo',

  // Otomatis restart mesin setelah opsi disetel agar langsung diterapkan
  reboot: true,

  // Definisi Preset Konfigurasi Siap Pakai
  presets: {
    // Mematikan pengambilan foto kamera & mematikan transmisi foto ke server
    'disable-photo': [
      { name: 'CapturePic', value: '0', desc: 'Matikan jepret foto kamera saat absensi' },
      { name: 'TransFlag', value: '110111111111', desc: 'Matikan upload AttPhoto ke server via ADMS' }
    ],

    // Mengaktifkan kembali pengambilan foto & transmisi foto ke server
    'enable-photo': [
      { name: 'CapturePic', value: '4', desc: 'Aktifkan jepret foto kamera saat absensi' },
      { name: 'TransFlag', value: '111111111111', desc: 'Aktifkan upload AttPhoto ke server via ADMS' }
    ],

    // Hanya matikan jepretan kamera (CapturePic=0)
    'pic-off': [
      { name: 'CapturePic', value: '0', desc: 'Matikan jepret foto kamera saat absensi' }
    ],

    // Hanya aktifkan jepretan kamera (CapturePic=4)
    'pic-on': [
      { name: 'CapturePic', value: '4', desc: 'Aktifkan jepret foto kamera saat absensi' }
    ]
  },

  // Opsi custom bebas (digunakan jika activePreset disetel ke 'custom' di atas)
  customOptions: [
    { name: 'CapturePic', value: '0', desc: 'Custom option' }
  ]
};

// =============================================================================
// PARSER ARGUMEN CLI
// =============================================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    sn: null,
    all: false,
    preset: null,
    explicitOptions: [],
    reboot: null,
    dryRun: false,
    clearPending: false,
    list: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--list' || arg === '-l') {
      parsed.list = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--clear') {
      parsed.clearPending = true;
    } else if (arg === '--all' || arg === '-a') {
      parsed.all = true;
      parsed.sn = null;
    } else if (arg === '--sn' || arg === '-s') {
      parsed.sn = args[++i];
      parsed.all = false;
    } else if (arg === '--disable-photo' || arg === '--no-photo') {
      parsed.preset = 'disable-photo';
    } else if (arg === '--enable-photo') {
      parsed.preset = 'enable-photo';
    } else if (arg === '--preset' || arg === '-p') {
      parsed.preset = args[++i];
    } else if (arg === '--option' || arg === '-o') {
      const optVal = args[++i];
      if (optVal) {
        // Mendukung opsi dipisah koma, contoh: -o "CapturePic=0,TransFlag=110111111111"
        const pairs = optVal.split(',');
        for (const pair of pairs) {
          const [k, v] = pair.split('=');
          if (k && v !== undefined) {
            parsed.explicitOptions.push({ name: k.trim(), value: v.trim() });
          }
        }
      }
    } else if (arg === '--reboot') {
      parsed.reboot = true;
    } else if (arg === '--no-reboot') {
      parsed.reboot = false;
    } else if (!arg.startsWith('-') && !parsed.sn) {
      parsed.sn = arg;
    }
  }

  return parsed;
}

function showHelp() {
  const availablePresets = Object.keys(DEVICE_OPTION_CONFIG.presets).join(', ');
  console.log(`
Penggunaan:
  node scripts/queue-device-option.js [opsi / flags]

Flag Konfigurasi & Preset Cepat:
  --disable-photo, --no-photo   Preset: Matikan jepret kamera (CapturePic=0) & stop upload (TransFlag)
  --enable-photo                Preset: Hidupkan jepret kamera (CapturePic=4) & aktifkan upload (TransFlag)
  --preset, -p <nama>           Pilih preset tertentu (${availablePresets})
  --option, -o <K=V>            Set opsi kustom Nama=Nilai (bisa dipanggil berulang kali)

Target Mesin:
  --all, -a                     Antrekan ke semua mesin fisik terverifikasi di database
  --sn, -s <SN>                 Serial Number mesin target tertentu

Kontrol Eksekusi:
  --reboot                      Antrekan REBOOT setelah SET OPTION (default sesuai config: ${DEVICE_OPTION_CONFIG.reboot ? 'YA' : 'TIDAK'})
  --no-reboot                   Jangan antrekan perintah REBOOT
  --clear                       Hapus antrean SET_OPTION / REBOOT pending lama sebelum antrekan baru
  --dry-run                     Simulasikan perintah tanpa menyimpan ke database
  --list, -l                    Tampilkan daftar mesin terdaftar dan status antreannya
  --help, -h                    Tampilkan pesan bantuan ini

Contoh Praktis:
  # 1. Jalankan langsung dengan konfigurasi bawaan (matikan foto semua mesin + reboot):
  node scripts/queue-device-option.js

  # 2. Matikan foto hanya untuk mesin tertentu:
  node scripts/queue-device-option.js --disable-photo --sn AEYU182060296

  # 3. Aktifkan kembali foto untuk semua mesin:
  node scripts/queue-device-option.js --enable-photo --all

  # 4. Kirim opsi bebas manual:
  node scripts/queue-device-option.js --sn AEYU182060296 -o CapturePic=0 -o Delay=30
`);
}

async function listDevicesAndQueue() {
  console.log('============================================================');
  console.log('DAFTAR PERANGKAT & ANTREAN PERINTAH');
  console.log('============================================================');

  const devRes = await db.query(`
    SELECT sn, name, ip_address, verified, platform, last_activity
    FROM devices
    WHERE sn NOT LIKE 'MDB_%'
    ORDER BY verified DESC, last_activity DESC NULLS LAST
  `);

  if (devRes.rows.length === 0) {
    console.log('Tidak ada perangkat fisik yang terdaftar di tabel devices.');
    return;
  }

  for (const dev of devRes.rows) {
    const qRes = await db.query(
      `SELECT id, command_type, command_params, status, created_at 
       FROM device_commands 
       WHERE device_sn = $1 AND status = 'pending' 
       ORDER BY id ASC`,
      [dev.sn]
    );

    const statusBadge = dev.verified ? '[VERIFIED]' : '[UNVERIFIED]';
    console.log(`\n• ${dev.name || 'Unnamed'} (${dev.sn}) ${statusBadge}`);
    console.log(`  IP: ${dev.ip_address || '-'} | Terakhir Aktif: ${dev.last_activity ? new Date(dev.last_activity).toLocaleString('id-ID') : 'Belum pernah'}`);
    console.log(`  Antrean Pending: ${qRes.rows.length} perintah`);

    if (qRes.rows.length > 0) {
      for (const cmd of qRes.rows) {
        let detail = cmd.command_type;
        if (cmd.command_type === 'SET_OPTION') {
          detail += ` (${cmd.command_params.name}=${cmd.command_params.value})`;
        }
        console.log(`    - ID #${cmd.id}: ${detail}`);
      }
    }
  }
  console.log('\n============================================================\n');
}

async function main() {
  const parsed = parseArgs();

  if (parsed.help) {
    showHelp();
    process.exit(0);
  }

  if (parsed.list) {
    try {
      await listDevicesAndQueue();
    } finally {
      await db.pool.end();
    }
    process.exit(0);
  }

  // 1. Tentukan Opsi yang akan dikirim
  let optionsToQueue = [];
  let sourceLabel = '';

  if (parsed.explicitOptions.length > 0) {
    optionsToQueue = parsed.explicitOptions;
    sourceLabel = 'Argumen CLI (--option)';
  } else if (parsed.preset) {
    const presetData = DEVICE_OPTION_CONFIG.presets[parsed.preset];
    if (!presetData) {
      console.error(`Error: Preset "${parsed.preset}" tidak ditemukan. Pilihan: ${Object.keys(DEVICE_OPTION_CONFIG.presets).join(', ')}`);
      process.exit(1);
    }
    optionsToQueue = presetData;
    sourceLabel = `Preset CLI (--${parsed.preset})`;
  } else {
    // Ambil dari konfigurasi default
    const active = DEVICE_OPTION_CONFIG.activePreset;
    if (active === 'custom') {
      optionsToQueue = DEVICE_OPTION_CONFIG.customOptions;
      sourceLabel = 'Konfigurasi Default (customOptions)';
    } else {
      const presetData = DEVICE_OPTION_CONFIG.presets[active];
      if (!presetData) {
        console.error(`Error: activePreset "${active}" di DEVICE_OPTION_CONFIG tidak valid.`);
        process.exit(1);
      }
      optionsToQueue = presetData;
      sourceLabel = `Konfigurasi Default (Preset: ${active})`;
    }
  }

  if (optionsToQueue.length === 0) {
    console.error('Error: Tidak ada opsi yang dikonfigurasi untuk dikirim.');
    process.exit(1);
  }

  // 2. Tentukan Reboot
  const shouldReboot = parsed.reboot !== null ? parsed.reboot : DEVICE_OPTION_CONFIG.reboot;

  try {
    // 3. Tentukan Target Perangkat
    let targetDevices = [];
    const targetMode = parsed.all ? 'ALL' : (parsed.sn || DEVICE_OPTION_CONFIG.target);

    if (targetMode === 'ALL' || parsed.all) {
      // Ambil semua mesin fisik terverifikasi (kecuali virtual sync seperti MDB_SOURCE)
      const res = await db.query(`
        SELECT sn, name, ip_address, verified 
        FROM devices 
        WHERE verified = TRUE AND sn NOT LIKE 'MDB_%'
      `);

      if (res.rows.length === 0) {
        console.warn('Peringatan: Tidak ada mesin fisik terverifikasi di database.');
        process.exit(0);
      }
      targetDevices = res.rows;
    } else {
      const targetSn = targetMode;
      const res = await db.query(
        'SELECT sn, name, ip_address, verified FROM devices WHERE sn = $1',
        [targetSn]
      );
      if (res.rows.length > 0) {
        targetDevices = res.rows;
      } else {
        console.warn(`Peringatan: Perangkat dengan SN "${targetSn}" belum terdaftar di tabel devices.`);
        targetDevices = [{ sn: targetSn, name: 'Unregistered Device', ip_address: '-' }];
      }
    }

    // 4. Tampilkan Rincian Eksekusi
    console.log('============================================================');
    console.log('   PENGATURAN OPSI PERANGKAT ADMS (DYNAMIC QUEUE RUNNER)   ');
    console.log('============================================================');
    console.log(`Sumber Opsi       : ${sourceLabel}`);
    console.log(`Daftar Opsi (${optionsToQueue.length}) :`);
    optionsToQueue.forEach((opt, idx) => {
      const desc = opt.desc ? ` (${opt.desc})` : '';
      console.log(`   ${idx + 1}. ${opt.name} = ${opt.value}${desc}`);
    });
    console.log(`Reboot Setelahnya : ${shouldReboot ? 'YA' : 'TIDAK'}`);
    console.log(`Target Mesin (${targetDevices.length}) :`);
    targetDevices.forEach(d => console.log(`   - ${d.sn} (${d.name || '-'} | IP: ${d.ip_address || '-'})`));
    if (parsed.dryRun) {
      console.log('\n[DRY RUN] Mode simulasi aktif. Tidak ada perubahan yang disimpan ke database.');
      console.log('============================================================\n');
      return;
    }
    console.log('------------------------------------------------------------');

    // 5. Eksekusi Antrean
    for (const dev of targetDevices) {
      // Hapus antrean pending lama jika diminta flag --clear
      if (parsed.clearPending) {
        const delRes = await db.query(
          `DELETE FROM device_commands 
           WHERE device_sn = $1 AND status = 'pending' AND command_type IN ('SET_OPTION', 'REBOOT')`,
          [dev.sn]
        );
        if (delRes.rowCount > 0) {
          console.log(`[${dev.sn}] [CLEANUP] Menghapus ${delRes.rowCount} antrean pending SET_OPTION/REBOOT lama.`);
        }
      }

      // Antrekan setiap opsi
      for (const opt of optionsToQueue) {
        const cmd = await commandService.queueCommand(dev.sn, config.COMMAND_TYPES.SET_OPTION, {
          name: opt.name.trim(),
          value: opt.value.trim()
        });
        console.log(`[${dev.sn}] [OK] SET OPTION "${opt.name}=${opt.value}" diantrekan -> ID: #${cmd.id}`);
      }

      // Antrekan REBOOT jika diaktifkan
      if (shouldReboot) {
        const rebootCmd = await commandService.queueCommand(dev.sn, config.COMMAND_TYPES.REBOOT, {});
        console.log(`[${dev.sn}] [OK] REBOOT diantrekan -> ID: #${rebootCmd.id}`);
      }
    }

    console.log('------------------------------------------------------------');
    console.log('STATUS: Berhasil masuk antrean tabel device_commands.');
    console.log('Mesin akan mengeksekusi perintah ini secara otomatis saat');
    console.log('heartbeat berikutnya (GET /iclock/getrequest).');
    console.log('============================================================\n');

  } catch (err) {
    console.error('Gagal mengantrekan opsi:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();
