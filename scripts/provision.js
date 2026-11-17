#!/usr/bin/env node
'use strict';

require('dotenv').config();

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const db = require('../src/db/connection');
const queries = require('../src/db/queries');
const config = require('../src/config');
const commandService = require('../src/services/commandService');
const roleScriptService = require('../src/services/roleScriptService');

const parseCliArgs = (argv) => {
  const args = {
    sn: null,
    opd: null,
    all: false,
    status: false,
    yes: false,
    help: false,
    limit: 50,
    serverUrl: null,
    dhcp: null,
    comKey: null,
    menu: null,
    roleSlot: null,
    roleDesc: null,
    pin: null,
    name: null,
    pri: null,
    passwd: null,
    reboot: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => (i + 1 < argv.length ? argv[++i] : null);

    switch (token) {
      case '--sn': args.sn = next(); break;
      case '--opd': args.opd = next(); break;
      case '--all': args.all = true; break;
      case '--status': args.status = true; break;
      case '--yes':
      case '-y': args.yes = true; break;
      case '--help':
      case '-h': args.help = true; break;
      case '--limit': args.limit = parseInt(next(), 10) || 50; break;
      case '--server-url': args.serverUrl = next(); break;
      case '--dhcp': args.dhcp = next(); break;
      case '--comkey': args.comKey = next(); break;
      case '--menu': args.menu = next(); break;
      case '--role-slot': args.roleSlot = next(); break;
      case '--role-desc': args.roleDesc = next(); break;
      case '--pin': args.pin = next(); break;
      case '--name': args.name = next(); break;
      case '--pri': args.pri = next(); break;
      case '--passwd': args.passwd = next(); break;
      case '--reboot': args.reboot = true; break;
      case '--no-reboot': args.reboot = false; break;
      default: break;
    }
  }

  return args;
};

const printHelp = () => {
  console.log(`
CLI Provisioning Mesin Absen (dbspot)
=====================================
Penggunaan:
  node scripts/provision.js [opsi]

Target (hanya memproses mesin dengan verified = true):
  --sn <SN>             Target 1 mesin berdasarkan Serial Number
  --opd <OPD_ID>        Target semua mesin terverifikasi pada OPD tertentu
  --all                 Target seluruh mesin terverifikasi

Mode Monitoring:
  --status              Tampilkan status antrean & hasil eksekusi (return_code, response_content)
  --limit <N>           Jumlah baris status (default: 50)

Parameter Opsional (jika tidak diisi, akan ditanyakan interaktif):
  --server-url <URL>    Base URL ADMS untuk wget (contoh: http://dbspot.meteoronyx.my.id)
  --dhcp <1|0>          Set DHCP ON (1) atau OFF (0)
  --comkey <KEY>        Set COMKey port 4370 di ZKSystem.db
  --menu <1,3,...>      Pilih nomor menu dari katalog (0 untuk skip)
  --role-slot <1|2|3>   Slot role mesin (1=custom1/Pri2, 2=custom2/Pri6, 3=custom3/Pri10)
  --role-desc <TEXT>    Label deskripsi role di tabel ROLE (contoh: log)
  --pin <PIN>           PIN/ID user di mesin (contoh: 1)
  --name <NAME>         Nama user di mesin (contoh: log)
  --pri <0|2|6|10|14>   Privilege ADMS user
  --passwd <PASS>       Password masuk menu user
  --reboot              Kirim REBOOT setelah selesai
  --no-reboot           Jangan kirim REBOOT
  -y, --yes             Lewati prompt konfirmasi akhir
  -h, --help            Tampilkan bantuan ini
`);
};

const printMenuCatalog = () => {
  console.log('\nKatalog Menu & Sub-Fitur Mesin (ZKDB.db):');
  console.log('  [0] Skip (tidak mengubah role/menu)');
  for (const item of roleScriptService.MENU_CATALOG) {
    console.log(
      `  [${item.key}] ${item.label} -> app: ${item.apps.join(',')} | func: ${item.funcs.join(',')}`
    );
  }
  console.log('  [C] Input manual app:func (contoh: comset:netset,logquery:attlog)\n');
};

const resolveMenuSelection = async (rl, rawSelection) => {
  const selection = String(rawSelection || '').trim();
  if (!selection || selection === '0') {
    return { apps: [], funcs: [] };
  }

  if (selection.toUpperCase() === 'C') {
    const manual = (await rl.question('Masukkan pasangan app:func (pisahkan koma, mis. comset:netset,logquery:attlog): ')).trim();
    const apps = [];
    const funcs = [];
    for (const rawPair of manual.split(',')) {
      const pair = rawPair.trim();
      if (!pair) continue;
      const parts = pair.split(':');
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        throw new Error(`Format app:func tidak valid: "${pair}". Gunakan format app:func, contoh comset:netset.`);
      }
      const app = parts[0].trim();
      const func = parts[1].trim();
      if (!apps.includes(app)) apps.push(app);
      if (!funcs.includes(func)) funcs.push(func);
    }
    return { apps, funcs };
  }

  const apps = [];
  const funcs = [];
  for (const part of selection.split(',')) {
    const num = parseInt(part.trim(), 10);
    const found = roleScriptService.MENU_CATALOG.find((m) => m.key === num);
    if (!found) {
      throw new Error(`Nomor menu tidak dikenal: ${part.trim()}`);
    }
    for (const a of found.apps) {
      if (!apps.includes(a)) apps.push(a);
    }
    for (const f of found.funcs) {
      if (!funcs.includes(f)) funcs.push(f);
    }
  }
  return { apps, funcs };
};

const askIfMissing = async (rl, currentValue, promptText) => {
  if (currentValue !== null && currentValue !== undefined) {
    return String(currentValue).trim();
  }
  return (await rl.question(promptText)).trim();
};

const showStatus = async (args) => {
  const rows = await queries.getProvisioningCommandStatuses({
    sn: args.sn,
    opdId: args.opd,
    limit: args.limit
  });

  if (!rows.length) {
    console.log('Belum ada riwayat command provisioning.');
    return;
  }

  console.table(
    rows.map((r) => ({
      id: r.id,
      sn: r.device_sn,
      device: r.device_name || '-',
      type: r.command_type,
      status: r.status,
      return_code: r.return_code !== null && r.return_code !== undefined ? r.return_code : '-',
      response: r.response_content ? r.response_content.replace(/\s+/g, ' ').slice(0, 80) : '-'
    }))
  );
};

const runProvision = async (args) => {
  const rl = readline.createInterface({ input, output });

  try {
    // 1. Tentukan target mesin
    let targetMode = null;
    if (args.sn) targetMode = 'sn';
    else if (args.opd) targetMode = 'opd';
    else if (args.all) targetMode = 'all';

    if (!targetMode) {
      console.log('\nPilih Target Mesin (hanya verified = true):');
      console.log('  [1] SN tertentu');
      console.log('  [2] Semua mesin dalam 1 OPD');
      console.log('  [3] Seluruh mesin terverifikasi');
      const choice = (await rl.question('Pilihan target (1/2/3): ')).trim();
      if (choice === '1') {
        args.sn = (await rl.question('Masukkan Serial Number (SN): ')).trim();
        targetMode = 'sn';
      } else if (choice === '2') {
        args.opd = (await rl.question('Masukkan OPD ID (UUID): ')).trim();
        targetMode = 'opd';
      } else if (choice === '3') {
        args.all = true;
        targetMode = 'all';
      } else {
        throw new Error('Pilihan target tidak valid.');
      }
    }

    const devices = await queries.getVerifiedDevices({
      sn: targetMode === 'sn' ? args.sn : null,
      opdId: targetMode === 'opd' ? args.opd : null
    });

    if (!devices.length) {
      console.log('Tidak ada mesin dengan status verified = true yang cocok dengan target.');
      return;
    }

    console.log(`\nDitemukan ${devices.length} mesin terverifikasi:`);
    for (const d of devices.slice(0, 10)) {
      console.log(`  - ${d.sn} (${d.device_name || 'Tanpa Nama'} | ${d.nama_opd || 'Tanpa OPD'})`);
    }
    if (devices.length > 10) {
      console.log(`  ... dan ${devices.length - 10} mesin lainnya`);
    }

    // 2. Input DHCP
    const dhcpInput = await askIfMissing(
      rl,
      args.dhcp,
      '\nSet DHCP? (1=ON, 0=OFF, Enter=skip): '
    );
    if (dhcpInput !== '' && dhcpInput !== '0' && dhcpInput !== '1') {
      throw new Error('Nilai DHCP harus 1, 0, atau kosong (skip).');
    }

    // 3. Input COMKey (port 4370)
    const comKeyInput = await askIfMissing(
      rl,
      args.comKey,
      'Set COMKey port 4370? (masukkan key alfanumerik, Enter=skip): '
    );

    // 4. Input Menu / Role
    let apps = [];
    let funcs = [];
    let roleSlot = null;
    let roleDesc = null;

    if (args.menu === null) {
      printMenuCatalog();
    }
    const menuInput = await askIfMissing(
      rl,
      args.menu,
      'Pilih nomor menu role (mis. 1 atau 1,3, Enter/0=skip): '
    );
    const resolvedMenu = await resolveMenuSelection(rl, menuInput);
    apps = resolvedMenu.apps;
    funcs = resolvedMenu.funcs;

    if (apps.length > 0 || funcs.length > 0) {
      const slotRaw = await askIfMissing(
        rl,
        args.roleSlot,
        'Pilih slot role [1=custom1(Pri 2), 2=custom2(Pri 6), 3=custom3(Pri 10)]: '
      );
      roleSlot = parseInt(slotRaw, 10);
      if (!roleScriptService.SLOT_CONFIG[roleSlot]) {
        throw new Error('Slot role harus 1, 2, atau 3.');
      }
      roleDesc = await askIfMissing(
        rl,
        args.roleDesc,
        'Masukkan label deskripsi role (huruf/angka/underscore, mis. log): '
      );
      if (!roleDesc) {
        throw new Error('Deskripsi role wajib diisi jika mengatur menu.');
      }
    }

    const needsShell = Boolean(comKeyInput) || apps.length > 0 || funcs.length > 0;
    let serverUrl = null;
    if (needsShell) {
      const rawServerUrl = await askIfMissing(
        rl,
        args.serverUrl,
        'Masukkan Base URL ADMS untuk wget mesin (contoh: http://dbspot.meteoronyx.my.id): '
      );
      serverUrl = commandService.normalizeServerUrl(rawServerUrl);
      // Cek panjang menggunakan contoh ID 8 digit agar aman dari -1007
      commandService.buildShellStagingCommand(99999999, serverUrl);
    }

    // 5. Input User (DATA_USER)
    let userParams = null;
    let wantUser = args.pin !== null;
    if (!wantUser && args.menu === null && args.comKey === null && args.dhcp === null) {
      const ans = (await rl.question('\nBuat/Update user di mesin via DATA USER? (y/N): ')).trim().toLowerCase();
      wantUser = ans === 'y' || ans === 'yes';
    } else if (!wantUser && args.pin === null) {
      const ans = (await rl.question('\nBuat/Update user di mesin via DATA USER? (y/N): ')).trim().toLowerCase();
      wantUser = ans === 'y' || ans === 'yes';
    }

    if (wantUser) {
      const pin = await askIfMissing(rl, args.pin, 'Masukkan User PIN (angka, mis. 1): ');
      const name = await askIfMissing(rl, args.name, 'Masukkan Nama User (mis. log): ');
      const suggestedPri = roleSlot ? roleScriptService.SLOT_CONFIG[roleSlot].pri : '';
      const priRaw = await askIfMissing(
        rl,
        args.pri,
        `Masukkan Privilege ADMS (0=User, 2=Custom1, 6=Custom2, 10=Custom3, 14=Admin${suggestedPri ? `, saran: ${suggestedPri}` : ''}): `
      );
      const passwd = await askIfMissing(
        rl,
        args.passwd,
        'Masukkan Password menu user (Enter jika kosong): '
      );

      if (!pin || priRaw === '') {
        throw new Error('User PIN dan Privilege wajib diisi.');
      }
      userParams = {
        pin: parseInt(pin, 10),
        privilege: parseInt(priRaw, 10)
      };
      if (name) userParams.name = name;
      if (passwd) userParams.passwd = passwd;
    }

    // 6. Reboot
    let wantReboot = false;
    if (args.reboot !== null) {
      wantReboot = Boolean(args.reboot);
    } else {
      const ans = (await rl.question('\nKirim perintah REBOOT di akhir? (y/N): ')).trim().toLowerCase();
      wantReboot = ans === 'y' || ans === 'yes';
    }

    // Validasi skrip shell sebelum mengantrekan apa pun
    const shellParams = needsShell
      ? { serverUrl, comKey: comKeyInput || null, roleSlot, roleDesc, apps, funcs }
      : null;
    if (shellParams) {
      roleScriptService.generateScript(shellParams);
    }

    if (!dhcpInput && !shellParams && !userParams && !wantReboot) {
      console.log('\nTidak ada aksi yang dipilih. Selesai.');
      return;
    }

    // Ringkasan sebelum eksekusi
    console.log('\n=== RINGKASAN PROVISIONING ===');
    console.log(`Target Mesin : ${devices.length} perangkat verified`);
    if (dhcpInput !== '') console.log(`1. SET_OPTION: DHCP=${dhcpInput}`);
    if (shellParams) {
      console.log(`2. SHELL     : ${serverUrl}/r/<id>`);
      if (comKeyInput) console.log(`   - COMKey  : ${comKeyInput}`);
      if (apps.length) console.log(`   - Role    : slot ${roleSlot} (${roleDesc}) | apps=${apps.join(',')} | funcs=${funcs.join(',')}`);
    }
    if (userParams) {
      console.log(`3. DATA_USER : PIN=${userParams.pin}, Name=${userParams.name || '-'}, Pri=${userParams.privilege}, Passwd=${userParams.passwd ? '***' : '-'}`);
    }
    if (wantReboot) console.log('4. REBOOT    : Ya');

    if (!args.yes) {
      const confirm = (await rl.question('\nAntrekan perintah ke database? (y/N): ')).trim().toLowerCase();
      if (confirm !== 'y' && confirm !== 'yes') {
        console.log('Dibatalkan.');
        return;
      }
    }

    // Eksekusi queue per device
    let queuedCount = 0;
    for (const d of devices) {
      if (dhcpInput !== '') {
        await commandService.queueCommand(d.sn, config.COMMAND_TYPES.SET_OPTION, {
          name: 'DHCP',
          value: dhcpInput
        });
        queuedCount += 1;
      }
      if (shellParams) {
        await commandService.queueCommand(d.sn, config.COMMAND_TYPES.SHELL, shellParams);
        queuedCount += 1;
      }
      if (userParams) {
        await commandService.queueCommand(d.sn, config.COMMAND_TYPES.DATA_USER, userParams);
        queuedCount += 1;
      }
      if (wantReboot) {
        await commandService.queueCommand(d.sn, config.COMMAND_TYPES.REBOOT);
        queuedCount += 1;
      }
    }

    console.log(`\nBerhasil mengantrekan ${queuedCount} command untuk ${devices.length} mesin.`);
    console.log('Pantau status eksekusi dengan: node scripts/provision.js --status');
  } finally {
    rl.close();
  }
};

const main = async () => {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  try {
    if (args.status) {
      await showStatus(args);
    } else {
      await runProvision(args);
    }
  } finally {
    await db.pool.end();
  }
};

main().catch((err) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
