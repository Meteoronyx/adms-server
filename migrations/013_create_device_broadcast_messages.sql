-- Migration: Device Broadcast Messages (Public SMS / Running Text)
-- Description: Tabel untuk menyimpan master pesan pengumuman layar berjalan (SMS_INFO TAG=253)
-- Created: 2026-10-15

CREATE TABLE IF NOT EXISTS device_broadcast_messages (
  id SERIAL PRIMARY KEY,
  opd_id UUID REFERENCES opds(id) ON DELETE CASCADE,
  device_sn VARCHAR(32) REFERENCES devices(sn) ON DELETE CASCADE,
  message VARCHAR(320) NOT NULL,
  tag INTEGER NOT NULL DEFAULT 253,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_msg_opd ON device_broadcast_messages(opd_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_msg_device ON device_broadcast_messages(device_sn);
CREATE INDEX IF NOT EXISTS idx_broadcast_msg_active ON device_broadcast_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_msg_created_at ON device_broadcast_messages(created_at DESC);
