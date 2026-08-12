-- Migration: Create Dynamic RBAC Tables (roles, permissions, role_permissions)
-- Description: Mendukung Role-Based Access Control Dinamis dengan granularitas izin per modul
-- Created: 2026-08-13

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Tambahkan foreign key role_id di tabel users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Seed System Roles
INSERT INTO roles (name, slug, description, is_system) VALUES
  ('Administrator', 'admin', 'Akses penuh ke seluruh fitur dan pengaturan sistem', true),
  ('Operator', 'operator', 'Akses operasional standar untuk pengelolaan perangkat, presensi, dan sidik jari', true),
  ('Viewer', 'viewer', 'Akses membaca log presensi dan daftar perangkat tanpa izin pengubahan', false)
ON CONFLICT (slug) DO UPDATE 
  SET name = EXCLUDED.name, 
      description = EXCLUDED.description, 
      is_system = EXCLUDED.is_system;

-- Seed System Permissions
INSERT INTO permissions (code, name, category, description) VALUES
  ('devices:read', 'Lihat Perangkat', 'Perangkat', 'Melihat daftar, status, dan rincian perangkat'),
  ('devices:write', 'Kelola Perangkat', 'Perangkat', 'Mendaftarkan, mengubah nama, dan verifikasi perangkat'),
  ('devices:command', 'Kirim Perintah', 'Perangkat', 'Mengirim perintah reboot, hapus log, reupload, dan pesan perintah ke perangkat'),
  ('users:read', 'Lihat Pengguna', 'Pengguna', 'Melihat daftar pengguna sistem admin'),
  ('users:write', 'Kelola Pengguna', 'Pengguna', 'Menambah, memperbarui data pengguna, dan mereset kata sandi'),
  ('users:delete', 'Hapus Pengguna', 'Pengguna', 'Menghapus atau menonaktifkan pengguna sistem admin'),
  ('roles:read', 'Lihat Peran & Hak Akses', 'Peran & Hak Akses', 'Melihat daftar peran dan rincian hak akses'),
  ('roles:write', 'Kelola Peran', 'Peran & Hak Akses', 'Menambah, mengedit peran kustom, dan mengonfigurasi rincian izin'),
  ('roles:delete', 'Hapus Peran', 'Peran & Hak Akses', 'Menghapus peran kustom yang tidak terikat pengguna active'),
  ('attendance:read', 'Lihat Presensi', 'Log Presensi', 'Melihat riwayat log absensi pegawai'),
  ('attendance:export', 'Ekspor Presensi', 'Log Presensi', 'Mengunduh / mengekspor laporan presensi'),
  ('fingerprint:manage', 'Kelola Sidik Jari', 'Sidik Jari', 'Pendaftaran sidik jari baru dan pemindahan data sidik jari antar perangkat')
ON CONFLICT (code) DO UPDATE 
  SET name = EXCLUDED.name, 
      category = EXCLUDED.category, 
      description = EXCLUDED.description;

-- Hubungkan seluruh permissions ke role 'admin'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- Hubungkan operational permissions ke role 'operator'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r
JOIN permissions p ON p.code IN ('devices:read', 'devices:write', 'devices:command', 'attendance:read', 'attendance:export', 'fingerprint:manage')
WHERE r.slug = 'operator'
ON CONFLICT DO NOTHING;

-- Hubungkan read permissions ke role 'viewer'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r
JOIN permissions p ON p.code IN ('devices:read', 'attendance:read')
WHERE r.slug = 'viewer'
ON CONFLICT DO NOTHING;

-- Link data user lama yang memiliki string 'role' ke role_id di tabel roles
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role_id IS NULL AND LOWER(u.role) = r.slug;
