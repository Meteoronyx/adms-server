-- Migration: Add Indexes for Device Commands Pagination and Filtering
-- Description: Menambahkan index komposit status & created_at untuk query pagination cepat pada tabel device_commands
-- Created: 2026-10-17

CREATE INDEX IF NOT EXISTS idx_device_commands_status_created_at
ON device_commands (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_commands_created_at
ON device_commands (created_at DESC);
