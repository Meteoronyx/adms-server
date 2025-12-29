-- Migration: User & Fingerprint Management
-- Description: Tabel untuk menyimpan data user dan fingerprint dari OPERLOG
-- Created: 2025-12-28

-- =========================================================
-- 1. TABEL MASTER: pegawai
-- =========================================================
CREATE TABLE IF NOT EXISTS pegawai (
  pin VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  privilege SMALLINT DEFAULT 0,
  password VARCHAR(255),
  card VARCHAR(64),
  group_no SMALLINT DEFAULT 1,
  timezone VARCHAR(32),
  verify_mode SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 2. TABEL RELASI: pegawai <-> device mapping
-- =========================================================
CREATE TABLE IF NOT EXISTS pegawai_device_mapping (
  id BIGSERIAL PRIMARY KEY,
  pegawai_pin VARCHAR(32) NOT NULL REFERENCES pegawai(pin) ON DELETE CASCADE,
  device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  device_name VARCHAR(255),
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pegawai_pin, device_sn)
);

-- =========================================================
-- 3. TABEL: pegawai fingerprint
-- =========================================================
CREATE TABLE IF NOT EXISTS pegawai_fingerprints (
  id BIGSERIAL PRIMARY KEY,
  pegawai_pin VARCHAR(32) NOT NULL REFERENCES pegawai(pin) ON DELETE CASCADE,
  device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  finger_id SMALLINT NOT NULL,
  template TEXT NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pegawai_pin, device_sn, finger_id)
);

-- =========================================================
-- 4. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_pegawai_device_mapping_pin ON pegawai_device_mapping(pegawai_pin);
CREATE INDEX IF NOT EXISTS idx_pegawai_device_mapping_sn ON pegawai_device_mapping(device_sn);
CREATE INDEX IF NOT EXISTS idx_pegawai_fp_pin ON pegawai_fingerprints(pegawai_pin);
CREATE INDEX IF NOT EXISTS idx_pegawai_fp_device ON pegawai_fingerprints(device_sn);
CREATE INDEX IF NOT EXISTS idx_pegawai_name ON pegawai(name);
