-- Migration: Disable Auto-Drop for Attendance Logs
-- Description: Data tidak akan dihapus selamanya
-- Created: 2026-01-02

-- Redefine existing function with DROP logic disabled
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
    
    IF partition_date < (now() - interval '1 year')::date THEN
      RAISE NOTICE 'Skipping drop for old partition: %. Data is retained.', old_partition.tablename;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
