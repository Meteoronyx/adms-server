-- Migration: Attendance Photos Table
-- Description: Tabel untuk menyimpan metadata dan path fisik foto absensi (ATTPHOTO / /iclock/fdata)
-- Created: 2026-10-15

CREATE TABLE IF NOT EXISTS attendance_photos (
  id BIGSERIAL PRIMARY KEY,
  device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  user_pin VARCHAR(32) NOT NULL,
  photo_time TIMESTAMP NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_sn, user_pin, photo_time)
);

CREATE INDEX IF NOT EXISTS idx_attphoto_device_pin_time ON attendance_photos(device_sn, user_pin, photo_time DESC);
CREATE INDEX IF NOT EXISTS idx_attphoto_pin_time ON attendance_photos(user_pin, photo_time DESC);
CREATE INDEX IF NOT EXISTS idx_attphoto_device ON attendance_photos(device_sn);
CREATE INDEX IF NOT EXISTS idx_attphoto_photo_time ON attendance_photos(photo_time DESC);
