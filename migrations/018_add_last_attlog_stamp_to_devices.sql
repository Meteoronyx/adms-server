-- Migration: Add last_attlog_stamp to devices
-- Tracks the latest ATTLOG Stamp reported by each ADMS device for users-only sync

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS last_attlog_stamp BIGINT;
