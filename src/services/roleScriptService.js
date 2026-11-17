'use strict';

const STAGING_TTL_MS = 15 * 60 * 1000;
const SAFE_IDENT_RE = /^[a-zA-Z0-9_]+$/;
const SAFE_COMKEY_RE = /^[a-zA-Z0-9]+$/;

/**
 * Mapping slot custom role ke tabel ROLE / ROLE_PERMISSION di ZKDB.db
 * serta nilai Pri ADMS yang bersesuaian.
 */
const SLOT_CONFIG = {
  1: { roleName: 'custom1', roleId: 3, permission: 4, pri: 2 },
  2: { roleName: 'custom2', roleId: 4, permission: 8, pri: 6 },
  3: { roleName: 'custom3', roleId: 5, permission: 10, pri: 10 }
};

/**
 * Katalog menu & sub-fitur ZKDB.db untuk pilihan bernomor di CLI.
 */
const MENU_CATALOG = [
  {
    key: 1,
    label: 'Ethernet saja',
    apps: ['comset'],
    funcs: ['netset']
  },
  {
    key: 2,
    label: 'Komunikasi & Jaringan Lengkap (Ethernet, WiFi, ADMS, Serial)',
    apps: ['comset'],
    funcs: ['netset', 'wifiset', 'admsset', 'serialset']
  },
  {
    key: 3,
    label: 'Log / Rekaman Presensi',
    apps: ['logquery'],
    funcs: ['attlog', 'attpic', 'blacklistpic']
  },
  {
    key: 4,
    label: 'Info Sistem',
    apps: ['sysinfo'],
    funcs: ['devinfo', 'firmwareinfo', 'datacapacity']
  },
  {
    key: 5,
    label: 'Manajemen Flashdisk',
    apps: ['udiskmng'],
    funcs: ['udiskdownload', 'udiskupload', 'udiskset']
  },
  {
    key: 6,
    label: 'Pengujian Diagnostik',
    apps: ['autotest'],
    funcs: ['screentest', 'voicetest', 'keytest', 'fptest', 'cameratest']
  },
  {
    key: 7,
    label: 'Manajemen User (Admin)',
    apps: ['usermng'],
    funcs: ['adduser', 'userlist']
  },
  {
    key: 8,
    label: 'Pengaturan Sistem (Admin)',
    apps: ['sysset'],
    funcs: ['timeset', 'restoreset']
  },
  {
    key: 9,
    label: 'Manajemen Hak Akses (Admin)',
    apps: ['primng'],
    funcs: ['primng']
  },
  {
    key: 10,
    label: 'Hapus Data (Admin)',
    apps: ['cleardata'],
    funcs: ['cleardata']
  }
];

const sanitizeIdentifiers = (items = []) => {
  if (!Array.isArray(items)) return [];
  const unique = [];
  for (const raw of items) {
    const val = String(raw || '').trim();
    if (!val) continue;
    if (!SAFE_IDENT_RE.test(val)) {
      throw new Error(`Invalid identifier: ${val}`);
    }
    if (!unique.includes(val)) unique.push(val);
  }
  return unique;
};

/**
 * Validasi apakah command SHELL masih layak diakses melalui GET /r/:id.
 */
const validateCommandAvailability = (command, now = new Date()) => {
  if (!command) {
    return { ok: false, status: 404, message: 'Command not found' };
  }
  if (command.command_type !== 'SHELL') {
    return { ok: false, status: 404, message: 'Not a staging shell command' };
  }
  if (command.status !== 'pending' && command.status !== 'executed') {
    return { ok: false, status: 410, message: 'Staging script already completed or expired' };
  }

  const refTime = command.executed_at || command.created_at;
  if (refTime) {
    const ageMs = now.getTime() - new Date(refTime).getTime();
    if (ageMs > STAGING_TTL_MS) {
      return { ok: false, status: 410, message: 'Staging script expired' };
    }
  }

  return { ok: true };
};

/**
 * Generate skrip /bin/sh dinamis untuk dieksekusi di mesin absen ZKTeco.
 */
const generateScript = (params = {}) => {
  const lines = [
    '#!/bin/sh',
    'SQL=/mnt/mtdblock/data/sqlite3_mips',
    'DB=/mnt/mtdblock/data/ZKDB.db',
    'SYS=/mnt/mtdblock/data/ZKSystem.db',
    '[ ! -f "$SQL" ] && SQL=$(which sqlite3)',
    '[ ! -f "$DB" ] && DB=/mnt/mtdblock/ZKDB.db',
    '[ ! -f "$SYS" ] && SYS=/mnt/mtdblock/ZKSystem.db'
  ];

  // 1. Update COMKey di ZKSystem.db jika diisi
  if (params.comKey !== undefined && params.comKey !== null && String(params.comKey).trim() !== '') {
    const comKey = String(params.comKey).trim();
    if (!SAFE_COMKEY_RE.test(comKey)) {
      throw new Error('Invalid COMKey format (alphanumeric only)');
    }
    lines.push(
      `$SQL $SYS "UPDATE OPTION_INFO SET Option_Value='${comKey}' WHERE Option_Name='COMKey';"`
    );
  }

  // 2. Update Role & Permission di ZKDB.db jika apps/funcs diisi
  const apps = sanitizeIdentifiers(params.apps);
  const funcs = sanitizeIdentifiers(params.funcs);
  if (apps.length > 0 || funcs.length > 0) {
    const slotNum = Number(params.roleSlot || 1);
    const slot = SLOT_CONFIG[slotNum];
    if (!slot) {
      throw new Error(`Invalid roleSlot: ${params.roleSlot}`);
    }

    const roleDesc = String(params.roleDesc || 'log').trim();
    if (!SAFE_IDENT_RE.test(roleDesc)) {
      throw new Error(`Invalid roleDesc: ${roleDesc}`);
    }

    lines.push(
      `$SQL $DB "UPDATE ROLE SET Role_Name='${slot.roleName}', Description='${roleDesc}', Using_Status=1, Flag=1 WHERE ID=${slot.roleId};"`,
      `$SQL $DB "UPDATE ROLE_PERMISSION SET Role_Name='${slot.roleName}', Permission=${slot.permission} WHERE ID=${slot.roleId};"`,
      `$SQL $DB "DELETE FROM APP_PERMISSION WHERE Permission=${slot.permission};"`,
      `$SQL $DB "DELETE FROM FUNC_PERMISSION WHERE Permission=${slot.permission};"`
    );

    if (apps.length > 0) {
      const appSql = apps
        .map((a) => `INSERT INTO APP_PERMISSION (App_Name, Permission) VALUES ('${a}', ${slot.permission});`)
        .join(' ');
      lines.push(`$SQL $DB "${appSql}"`);
    }

    if (funcs.length > 0) {
      const funcSql = funcs
        .map((f) => `INSERT INTO FUNC_PERMISSION (Func_Name, Permission) VALUES ('${f}', ${slot.permission});`)
        .join(' ');
      lines.push(`$SQL $DB "${funcSql}"`);
    }
  }

  lines.push('sync', 'echo "PROVISION_OK"');
  return `${lines.join('\n')}\n`;
};

module.exports = {
  STAGING_TTL_MS,
  SLOT_CONFIG,
  MENU_CATALOG,
  validateCommandAvailability,
  generateScript
};
