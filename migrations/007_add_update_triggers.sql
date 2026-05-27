-- Migration: Add Update Triggers for updated_at
-- Description: Menambahkan trigger untuk otomatis memperbarui kolom updated_at saat data diubah
-- Created: 2026-05-26

-- =========================================================
-- 1. TRIGGER FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 2. APPLY TRIGGERS
-- =========================================================

-- Trigger untuk tabel pegawai
DROP TRIGGER IF EXISTS trg_update_pegawai_updated_at ON pegawai;
CREATE TRIGGER trg_update_pegawai_updated_at
BEFORE UPDATE ON pegawai
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger untuk tabel pegawai_device_mapping
DROP TRIGGER IF EXISTS trg_update_pegawai_device_mapping_updated_at ON pegawai_device_mapping;
CREATE TRIGGER trg_update_pegawai_device_mapping_updated_at
BEFORE UPDATE ON pegawai_device_mapping
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
