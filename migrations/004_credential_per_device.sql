-- Migration: Credential Per-Device
-- Description: Pindahkan privilege dan password dari pegawai ke pegawai_device_mapping
-- Created: 2026-01-13
-- Rationale: Setiap mesin bisa memiliki privilege/password berbeda untuk pegawai yang sama

-- =========================================================
-- 1. ADD COLUMNS TO pegawai_device_mapping
-- =========================================================
ALTER TABLE pegawai_device_mapping 
ADD COLUMN IF NOT EXISTS privilege SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- =========================================================
-- 2. MIGRATE EXISTING DATA FROM pegawai TO ALL DEVICE MAPPINGS
-- =========================================================
-- Copy privilege and password to all existing mappings for each pegawai
UPDATE pegawai_device_mapping pdm
SET 
  privilege = p.privilege,
  password = p.password
FROM pegawai p
WHERE pdm.pegawai_pin = p.pin
  AND (p.privilege > 0 OR (p.password IS NOT NULL AND p.password != ''));

-- =========================================================
-- 3. CREATE INDEX FOR PRIVILEGE QUERIES (find admins per device)
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_pegawai_device_mapping_privilege 
ON pegawai_device_mapping(privilege) WHERE privilege > 0;

-- =========================================================
-- 4. DROP OLD COLUMNS FROM pegawai TABLE
-- =========================================================
-- Remove privilege and password from master table (no longer used)
ALTER TABLE pegawai DROP COLUMN IF EXISTS privilege;
ALTER TABLE pegawai DROP COLUMN IF EXISTS password;
