'use strict';

const bcrypt = require('bcrypt');
const { query } = require('./connection');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Auto-seed initial admin user from .env if the users table is completely empty.
 * Runs once on application startup.
 */
async function seedAdminFromEnv() {
  try {
    const result = await query('SELECT COUNT(*)::int AS count FROM users;');
    const userCount = result.rows[0]?.count || 0;

    if (userCount > 0) {
      logger.debug(`Tabel users sudah terisi (${userCount} pengguna). Auto-seed dilewati.`);
      return;
    }

    const adminUsername = config.ADMIN_USERNAME || 'admin';
    const adminPassword = config.ADMIN_PASSWORD;

    if (!adminPassword) {
      logger.warn('ADMIN_PASSWORD tidak ditemukan di environment. Auto-seed admin ditunda.');
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminRoleRes = await query("SELECT id FROM roles WHERE slug = 'admin'");
    const adminRoleId = adminRoleRes.rows[0]?.id || null;

    await query(
      `INSERT INTO users (username, password_hash, name, role, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [adminUsername, passwordHash, 'System Administrator', 'admin', adminRoleId]
    );

    logger.info(`Pengguna admin awal ('${adminUsername}') berhasil dibuat dari environment variable.`);
  } catch (err) {
    logger.error('Gagal menjalankan auto-seed admin dari environment', {
      error: err.message,
      stack: err.stack
    });
  }
}

module.exports = {
  seedAdminFromEnv
};
