-- Migration: Create OPDS Table and Associations
-- Description: Tabel master OPD (unit kerja) serta relasi opd_id ke users, devices, dan pegawai
-- Created: 2026-08-13

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS opds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kdunker VARCHAR(32) NOT NULL UNIQUE,
  nama_opd VARCHAR(255) NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  radius NUMERIC(8, 2) DEFAULT 80.0,
  ip_public VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_opds_kdunker ON opds(kdunker);
CREATE INDEX IF NOT EXISTS idx_opds_nama_opd ON opds(nama_opd);

-- Tambahkan opd_id di tabel users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS opd_id UUID REFERENCES opds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_opd_id ON users(opd_id);

-- Tambahkan opd_id di tabel devices
ALTER TABLE devices 
  ADD COLUMN IF NOT EXISTS opd_id UUID REFERENCES opds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_devices_opd_id ON devices(opd_id);

-- Tambahkan opd_id di tabel pegawai
ALTER TABLE pegawai 
  ADD COLUMN IF NOT EXISTS opd_id UUID REFERENCES opds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pegawai_opd_id ON pegawai(opd_id);

-- Seed System Permissions untuk OPDS
INSERT INTO permissions (code, name, category, description) VALUES
  ('opds:read', 'Lihat OPD', 'Unit Kerja OPD', 'Melihat daftar dan rincian unit kerja OPD'),
  ('opds:write', 'Kelola OPD', 'Unit Kerja OPD', 'Menambah dan mengedit data unit kerja OPD'),
  ('opds:delete', 'Hapus OPD', 'Unit Kerja OPD', 'Menghapus data unit kerja OPD')
ON CONFLICT (code) DO UPDATE 
  SET name = EXCLUDED.name, 
      category = EXCLUDED.category, 
      description = EXCLUDED.description;

-- Hubungkan opds permissions ke role 'admin'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin' AND p.code IN ('opds:read', 'opds:write', 'opds:delete')
ON CONFLICT DO NOTHING;

-- Hubungkan opds:read ke role 'operator' dan 'viewer'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r
CROSS JOIN permissions p
WHERE r.slug IN ('operator', 'viewer') AND p.code = 'opds:read'
ON CONFLICT DO NOTHING;
