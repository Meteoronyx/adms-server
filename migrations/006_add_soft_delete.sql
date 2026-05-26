-- Migration: Add Soft Delete Columns
-- Description: Menambahkan kolom deleted_at dan updated_at untuk pegawai dan pegawai_device_mapping
-- Created: 2026-05-26

-- =========================================================
-- 1. ALTER TABLE pegawai
-- =========================================================
ALTER TABLE pegawai 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- =========================================================
-- 2. ALTER TABLE pegawai_device_mapping
-- =========================================================
ALTER TABLE pegawai_device_mapping 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
