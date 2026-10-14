-- Migration: Pegawai Faces Management
-- Description: Tabel untuk menyimpan 12 segment template wajah pegawai per device
-- Created: 2026-10-14

-- =========================================================
-- 1. TABEL: pegawai_faces
-- =========================================================
CREATE TABLE IF NOT EXISTS pegawai_faces (
  id BIGSERIAL PRIMARY KEY,
  pegawai_pin VARCHAR(32) NOT NULL REFERENCES pegawai(pin) ON DELETE CASCADE,
  device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  face_id SMALLINT NOT NULL,
  size INTEGER NOT NULL DEFAULT 1214,
  valid SMALLINT NOT NULL DEFAULT 1,
  template TEXT NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pegawai_pin, device_sn, face_id)
);

-- =========================================================
-- 2. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_pegawai_faces_pin ON pegawai_faces(pegawai_pin);
CREATE INDEX IF NOT EXISTS idx_pegawai_faces_device ON pegawai_faces(device_sn);

