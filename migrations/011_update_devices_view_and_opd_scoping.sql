-- Migration: Update devices_with_status view to include OPD fields
-- Description: Menambahkan opd_id, nama_opd, dan kdunker pada view devices_with_status
-- Created: 2026-08-13

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
  o.kdunker
FROM devices d
LEFT JOIN opds o ON d.opd_id = o.id;
