-- =========================================================
-- 1. BERSIH-BERSIH (RESET)
-- Hati-hati, ini menghapus semua data yang ada!
-- =========================================================
DROP TABLE IF EXISTS device_commands CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- =========================================================
-- 2. TABEL MASTER: DEVICES
-- =========================================================
CREATE TABLE devices (
  sn VARCHAR(32) PRIMARY KEY,
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
  status VARCHAR(20) DEFAULT 'offline',
  verified BOOLEAN DEFAULT FALSE,
  initial_sync_completed BOOLEAN DEFAULT FALSE
);

-- =========================================================
-- 3. TABEL UTAMA: ATTENDANCE_LOGS (PARTITIONED)
-- =========================================================
CREATE TABLE attendance_logs (
  -- Kita buang kolom 'id' serial karena tidak dibutuhkan dan memboroskan storage
  device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  user_pin VARCHAR(32) NOT NULL,
  check_time TIMESTAMP NOT NULL,
  status SMALLINT NOT NULL,
  verify_mode SMALLINT NOT NULL,
  
  -- PRIMARY KEY KOMPOSIT (Best Practice & Anti-Duplikat)
  -- Wajib menyertakan check_time karena ini tabel partisi
  PRIMARY KEY (device_sn, user_pin, check_time)
) PARTITION BY RANGE (check_time);

-- =========================================================
-- 4. PARTISI: PENANGANAN DATA LAMA (2020 - Nov 2025)
-- =========================================================
CREATE TABLE attendance_logs_history PARTITION OF attendance_logs
  FOR VALUES FROM (MINVALUE) TO ('2025-12-01 00:00:00');

-- =========================================================
-- 5. PARTISI: DATA MASA DEPAN (BULANAN)
-- =========================================================
-- Membuat partisi untuk 1 tahun ke depan (Des 2025 - Nov 2026)
CREATE TABLE attendance_logs_2025_12 PARTITION OF attendance_logs
  FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2026-01-01 00:00:00');

CREATE TABLE attendance_logs_2026_01 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');

CREATE TABLE attendance_logs_2026_02 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');

CREATE TABLE attendance_logs_2026_03 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');

CREATE TABLE attendance_logs_2026_04 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');

CREATE TABLE attendance_logs_2026_05 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');

CREATE TABLE attendance_logs_2026_06 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');

CREATE TABLE attendance_logs_2026_07 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-08-01 00:00:00');

CREATE TABLE attendance_logs_2026_08 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');

CREATE TABLE attendance_logs_2026_09 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');

CREATE TABLE attendance_logs_2026_10 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');

CREATE TABLE attendance_logs_2026_11 PARTITION OF attendance_logs
  FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');

-- Partisi DEFAULT: Menangkap data yang jatuh di luar semua range
-- Misalnya data dengan check_time 2026-12-15 sebelum partisi Des 2026 dibuat
-- PENTING: Harus dikosongkan secara periodik setelah partisi baru dibuat
CREATE TABLE attendance_logs_default PARTITION OF attendance_logs DEFAULT;

-- =========================================================
-- 6. INDEXING (OPTIMASI PERFORMA)
-- =========================================================
CREATE INDEX idx_attendance_logs_check_time ON attendance_logs(check_time DESC);
CREATE INDEX idx_attendance_logs_user_pin ON attendance_logs(user_pin);
CREATE INDEX idx_att_device_time ON attendance_logs (device_sn, check_time DESC);

-- =========================================================
-- 7. TABEL PENDUKUNG: COMMANDS
-- =========================================================
CREATE TABLE device_commands (
  id BIGSERIAL PRIMARY KEY,
  device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
  command_type VARCHAR(32) NOT NULL,
  command_params JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);

CREATE INDEX idx_device_commands_pending ON device_commands(device_sn, status) WHERE status = 'pending';

-- =========================================================
-- 8. FUNGSI OTOMATISASI (MAINTENANCE)
-- =========================================================

-- Fungsi 1: Membuat partisi bulan depan secara otomatis
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  next_month_start TIMESTAMP;
  table_name TEXT;
BEGIN
  next_month_start := date_trunc('month', now()) + interval '1 month';
  table_name := 'attendance_logs_' || to_char(next_month_start, 'YYYY_MM');
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_name) THEN
    EXECUTE format('CREATE TABLE %I PARTITION OF attendance_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_name, next_month_start, next_month_start + interval '1 month');
    RAISE NOTICE 'Sukses membuat partisi baru: %', table_name;
  ELSE
    RAISE NOTICE 'Partisi % sudah ada, skip.', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fungsi 2: Menghapus partisi (> 1 tahun)
-- CATATAN: Fungsi ini TIDAK akan menghapus attendance_logs_history dan attendance_logs_default
CREATE OR REPLACE FUNCTION drop_old_partitions()
RETURNS void AS $$
DECLARE
  old_partition RECORD;
  partition_date DATE;
BEGIN
  FOR old_partition IN
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE tablename ~ '^attendance_logs_20\d{2}_\d{2}$' 
  LOOP
    partition_date := to_date(
      substring(old_partition.tablename from 'attendance_logs_(\d{4}_\d{2})'), 
      'YYYY_MM'
    );
    
    -- Hapus jika lebih dari 1 tahun
    IF partition_date < (now() - interval '1 year')::date THEN
      EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(old_partition.schemaname) || '.' || quote_ident(old_partition.tablename);
      RAISE NOTICE 'Sayonara! Partisi tua dihapus: %', old_partition.tablename;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;