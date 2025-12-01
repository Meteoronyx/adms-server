-- Database setup for ADMS Server
-- Run this SQL in your PostgreSQL database

-- Drop existing tables if they exist (CASCADE to handle dependencies)
DROP TABLE IF EXISTS operation_logs CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- Table: devices
CREATE TABLE devices (
  sn VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  device_name VARCHAR(255),
  mac VARCHAR(255),
  user_count INTEGER,
  transaction_count INTEGER,
  main_time TIMESTAMP,
  platform VARCHAR(255),
  fw_version VARCHAR(255),
  ip_address VARCHAR(255),
  last_activity TIMESTAMP DEFAULT NOW(),
  timezone VARCHAR(10) DEFAULT '+07:00',
  status VARCHAR(20) DEFAULT 'offline'
);

-- Table: attendance_logs
CREATE TABLE attendance_logs (
  id BIGSERIAL PRIMARY KEY,
  device_sn VARCHAR(255) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  user_pin VARCHAR(255) NOT NULL,
  check_time TIMESTAMP NOT NULL,
  status INTEGER NOT NULL,
  verify_mode INTEGER NOT NULL,
  raw_data TEXT,
  
  -- Unique constraint to prevent duplicate logs
  UNIQUE(device_sn, user_pin, check_time)
);

-- Table: operation_logs
CREATE TABLE operation_logs (
  id BIGSERIAL PRIMARY KEY,
  device_sn VARCHAR(255) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  opcode INTEGER NOT NULL,
  admin_id VARCHAR(255) NOT NULL,
  op_time TIMESTAMP NOT NULL,
  obj1 VARCHAR(255),
  obj2 VARCHAR(255),
  obj3 VARCHAR(255),
  obj4 VARCHAR(255),
  raw_data TEXT,
  
  -- Unique constraint
  UNIQUE(device_sn, admin_id, op_time)
);

-- Indexes for better performance
CREATE INDEX idx_attendance_logs_device_sn ON attendance_logs(device_sn);
CREATE INDEX idx_attendance_logs_check_time ON attendance_logs(check_time);
CREATE INDEX idx_attendance_logs_user_pin ON attendance_logs(user_pin);

CREATE INDEX idx_operation_logs_device_sn ON operation_logs(device_sn);
CREATE INDEX idx_operation_logs_op_time ON operation_logs(op_time);

-- Insert a test device for development
INSERT INTO devices (sn, name, ip_address, status) 
VALUES ('TEST_DEVICE_001', 'Test Device', '127.0.0.1', 'online')
ON CONFLICT (sn) DO NOTHING;
