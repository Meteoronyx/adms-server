-- Migration: Add return_code and response_content to device_commands
-- Allows tracking execution return codes (e.g., 0, -1007) and stdout/response content from POST /iclock/devicecmd

ALTER TABLE device_commands
  ADD COLUMN IF NOT EXISTS return_code INTEGER,
  ADD COLUMN IF NOT EXISTS response_content TEXT;
