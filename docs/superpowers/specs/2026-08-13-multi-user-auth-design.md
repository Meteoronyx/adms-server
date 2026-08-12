# Multi-User Database Authentication & Dynamic RBAC Design

**Date**: 2026-08-13  
**Status**: Implemented / Approved (Opsi 1: Dynamic Permission-Based RBAC)  
**Author**: Antigravity Assistant & User  

---

## 1. Overview & Objectives

DBSpot implements a **Dynamic Permission-Based Role-Based Access Control (RBAC)** architecture using PostgreSQL, `bcrypt` password hashing, JWT cookies, and granular permissions per system module.

### Key Goals:
1. **Multi-User Database Persistence**: Support creating, listing, updating, and deactivating multiple server users with dynamic roles.
2. **Dynamic Roles & Granular Permissions**: Store `roles`, `permissions`, and `role_permissions` in database tables. System administrators can create custom roles (e.g. `Supervisor Cabang`, `Auditor Presensi`) and assign granular module permissions via UI without code redeployments.
3. **One-Time Startup Auto-Seed**: Auto-create default system roles (`admin`, `operator`, `viewer`), initial granular permissions, and seed the initial admin account from `.env` credentials if empty.
4. **Hybrid JWT + Dynamic Permission Middleware**: Middleware decodes JWT, loads user role and permission codes from database, and enforces `requirePermission(code)` checks on protected `/admin/*` routes.
5. **Full Backward Compatibility**: Keep all existing `/admin/*` endpoints and preserve `requireRole(['admin'])` checks alongside new permission checks.

---

## 2. Database Schema (`migrations/008_create_users_table.sql` & `migrations/009_create_rbac_tables.sql`)

### 2.1 Users Table (`users`)
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator',
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Roles Table (`roles`)
```sql
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Permissions Table (`permissions`)
```sql
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 Junction Table (`role_permissions`)
```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

---

## 3. System Permissions Categories

| Category | Permission Code | Description |
| :--- | :--- | :--- |
| **Perangkat** | `devices:read` | Melihat daftar, status, dan rincian perangkat |
| **Perangkat** | `devices:write` | Mendaftarkan, mengubah nama, dan verifikasi perangkat |
| **Perangkat** | `devices:command` | Mengirim perintah reboot, hapus log, reupload ke perangkat |
| **Pengguna** | `users:read` | Melihat daftar pengguna sistem admin |
| **Pengguna** | `users:write` | Menambah, memperbarui data pengguna, dan mereset kata sandi |
| **Pengguna** | `users:delete` | Menghapus atau menonaktifkan pengguna sistem admin |
| **Peran & Hak Akses** | `roles:read` | Melihat daftar peran dan rincian hak akses |
| **Peran & Hak Akses** | `roles:write` | Menambah/mengedit peran kustom dan matriks izin |
| **Peran & Hak Akses** | `roles:delete` | Menghapus peran kustom |
| **Log Presensi** | `attendance:read` | Melihat riwayat log absensi pegawai |
| **Log Presensi** | `attendance:export` | Mengunduh / mengekspor laporan presensi |
| **Sidik Jari** | `fingerprint:manage` | Pendaftaran dan pemindahan data sidik jari antar perangkat |

---

## 4. Middleware & Auth Flow

### 4.1 Auth Middleware (`src/middleware/apiKeyAuth.js`)
- Decodes JWT token and queries PostgreSQL:
  ```sql
  SELECT u.id, u.username, u.name, u.is_active, u.role_id,
         COALESCE(r.slug, u.role) AS role_slug,
         COALESCE(r.name, u.role) AS role_name,
         COALESCE(ARRAY_REMOVE(ARRAY_AGG(p.code), NULL), '{}') AS permissions
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id OR LOWER(u.role) = r.slug
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE u.id = $1
  GROUP BY u.id, u.username, u.name, u.is_active, u.role_id, r.slug, r.name;
  ```
- Attaches `req.user` object: `{ id, username, name, role: 'admin', role_name, role_id, permissions: ['*'] }`.

### 4.2 Permission & Role Middleware (`src/middleware/requireRole.js`)
- `requirePermission(requiredPermission)`: Checks if `req.user.permissions` includes the needed code or `'*'`. Superadmin (`admin`) bypasses all checks.
- `requireRole(allowedRoles)`: Backward compatible role check.

---

## 5. REST API Endpoints

### 5.1 Auth & User Management Endpoints (`src/routes/auth.js`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/login` | Public | Login & set HTTP-only cookie |
| `POST` | `/admin/logout` | Authenticated | Logout & clear cookie |
| `GET` | `/admin/me` | Authenticated | Get logged in user profile + permissions |
| `GET` | `/admin/users` | `users:read` / Admin | List all registered users |
| `POST` | `/admin/users` | `users:write` / Admin | Create user with dynamic `role_id` |
| `PUT` | `/admin/users/:id` | `users:write` / Admin | Update user details, role, & status |
| `PUT` | `/admin/users/:id/password` | `users:write` / Self | Change / Reset user password |
| `DELETE` | `/admin/users/:id` | `users:delete` / Admin | Deactivate user |

### 5.2 Roles & Permissions Management Endpoints (`src/routes/roles.js`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/roles` | `roles:read` / `users:read` | List roles with user count and permissions |
| `GET` | `/admin/permissions` | `roles:read` / `users:read` | List system permissions grouped by category |
| `POST` | `/admin/roles` | `roles:write` | Create a new dynamic role with permissions |
| `PUT` | `/admin/roles/:id` | `roles:write` | Update role name, description, and permission list |
| `DELETE` | `/admin/roles/:id` | `roles:delete` | Delete custom role (system roles protected) |
