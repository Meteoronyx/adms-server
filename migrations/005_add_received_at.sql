-- Migration: Add received_at to attendance_logs
-- Description: Menambahkan kolom received_at untuk mengetahui kapan log absen diterima server
-- Created: 2026-04-29

-- =========================================================
-- 1. ADD COLUMN received_at TO attendance_logs (partitioned)
-- =========================================================
-- PostgreSQL akan otomatis propagasi ke semua partition child
-- Data yang sudah ada akan tetap NULL
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP;
