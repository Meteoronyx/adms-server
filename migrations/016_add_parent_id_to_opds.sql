-- Migration: Add parent_id to opds table for Parent-Child OPD hierarchy (Induk & Sub-Induk)
-- Description: Menambahkan kolom parent_id berbasis UUID pada tabel opds, memetakan relasi otomatis berdasarkan 4 digit awal kdunker, dan memperbarui view devices_with_status.
-- Created: 2026-11-03

-- 1. Tambahkan kolom parent_id pada tabel opds
ALTER TABLE opds
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES opds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opds_parent_id ON opds(parent_id);

-- 2. Auto-populate parent_id untuk seluruh Sub-OPD berdasarkan 4 digit prefix kdunker OPD Induk (XXXX00000000000)
UPDATE opds child
SET parent_id = parent.id,
    updated_at = NOW()
FROM opds parent
WHERE parent.kdunker = SUBSTRING(child.kdunker FROM 1 FOR 4) || '00000000000'
  AND parent.deleted_at IS NULL
  AND child.deleted_at IS NULL
  AND child.id != parent.id
  AND child.parent_id IS NULL;

-- 3. Perbarui view devices_with_status agar menyertakan parent_opd_id dan parent_nama_opd
CREATE OR REPLACE VIEW devices_with_status AS
SELECT 
  d.sn, 
  d.name,
  d.device_name,
  d.mac,
  d.user_count,
  d.transaction_count,
  d.main_time,
  d.platform,
  d.fw_version,
  d.ip_address,
  d.last_activity,
  d.timezone,
  CASE 
    WHEN NOW() - d.last_activity < INTERVAL '10 minutes' THEN 'online'
    ELSE 'offline' 
  END AS status,
  d.verified,
  d.initial_sync_completed,
  d.opd_id,
  o.nama_opd,
  o.kdunker,
  o.parent_id AS parent_opd_id,
  po.nama_opd AS parent_nama_opd
FROM devices d
LEFT JOIN opds o ON d.opd_id = o.id
LEFT JOIN opds po ON o.parent_id = po.id;
