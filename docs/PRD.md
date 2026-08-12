# DBSpot — Server Presensi & Manajemen Hardware ADMS

**Versi**: 1.7.0  
**Tanggal**: 2026-08-13  
**Pengembang**: Diskominfo Kabupaten Tangerang  

---

## 1. Visi & Pengenalan Produk

**DBSpot** adalah aplikasi server presensi tingkat instansi berbasis web yang digunakan untuk mengelola perangkat absensi biometrik (sidik jari & pemindai wajah), memantau log kehadiran pegawai secara real-time, mengelola perintah remote hardware melalui protokol ADMS, serta mengatur hak akses pengguna (RBAC) secara dinamis.

---

## 2. Arsitektur Teknologi (Tech Stack)

### Backend (Core Server)
- **Runtime**: Node.js v18+ (Express.js)
- **Database**: PostgreSQL 15+ dengan ekstensi `pg` connection pool.
- **Autentikasi**: JWT (JSON Web Tokens) disimpan dalam `HttpOnly` Secure Cookie + `bcrypt` password hashing.
- **Protokol Hardware**: ADMS Push Protocol (HTTP POST/GET untuk mesin ZKTeco & Hikvision).
- **Background Queue / Workers**: Node.js event emitter & in-memory command queue sync.

### Frontend (User Interface)
- **Framework**: React 18 (Vite bundler).
- **Styling**: Tailwind CSS v3 dengan HSL dynamic dark/light mode tokens.
- **UI Primitives**: `@base-ui-components/react` (v1.6.0) untuk Modal, DropdownMenu, Tooltip, dan Popovers.
- **Icons**: `lucide-react`.

---

## 3. Skema Data & Matriks Hak Akses (RBAC)

DBSpot menerapkan **Dynamic Permission-Based Role-Based Access Control (RBAC)** berbasis tabel PostgreSQL:

### 3.1 Tabel Utama
1. **`users`**: Menyimpan kredensial (`username`, `password_hash`, `name`), status `is_active`, dan referensi `role_id`.
2. **`roles`**: Menyimpan entitas peran (`name`, `slug`, `description`, `is_system`). Peran sistem bawaan: `admin`, `operator`, `viewer`.
3. **`permissions`**: Katalog izin sistem ber-kategori (`devices:read`, `devices:write`, `devices:command`, `users:read`, `users:write`, `users:delete`, `roles:read`, `roles:write`, `roles:delete`, `attendance:read`, `attendance:export`, `fingerprint:manage`).
4. **`role_permissions`**: Tabel junction pencocokan peran dengan izin.

### 3.2 Matriks Peran Sistem

| Peran (Role) | Slug | Karakteristik Hak Akses |
| :--- | :--- | :--- |
| **Superadmin** | `admin` | Bypass seluruh pengecekan izin (`*`), memiliki kontrol penuh sistem |
| **Operator** | `operator` | Izin bawaan: `devices:read`, `devices:write`, `devices:command`, `attendance:read`, `attendance:export` |
| **Viewer** | `viewer` | Izin bawaan: `devices:read`, `attendance:read` (hanya dapat melihat data, tanpa tombol aksi) |
| **Peran Kustom** | *bebas* | Matriks izin dapat dikonfigurasi secara dinamis dari menu UI *Hak Akses* |

---

## 4. Alur Proteksi Keamanan Backend & Frontend

### 4.1 Backend Authorization Flow
1. **Authentication Middleware (`apiKeyAuth.js`)**:
   - Memverifikasi cookie `token` JWT atau header `Authorization: Bearer <token>`.
   - Mengambil data pengguna dari tabel `users` beserta daftar permission code dari `role_permissions`.
   - Menempelkan objek `req.user = { id, username, name, role, permissions: [...] }`.
2. **Permission Check Middleware (`requireRole.js`)**:
   - `requirePermission('code')`: Memeriksa apakah `req.user.permissions` mengandung izin yang dibutuhkan atau `'*'`. Jika tidak, mengembalikan HTTP 403 Forbidden.

### 4.2 Frontend Dynamic UI Hiding
1. **Sidebar Navigation (`Layout.jsx`)**:
   - Setiap item menu navigasi memiliki properti `permission`.
   - Item menu yang tidak sesuai dengan izin pengguna logged-in akan tersembunyi secara otomatis.
2. **Client-Side Route Guard (`App.jsx`)**:
   - Komponen `PermissionRoute` mengamankan akses URL langsung. Jika diketik manual tanpa izin, otomatis meredirect ke Dashboard `/`.
3. **Conditional Action Buttons**:
   - Tombol-tombol berisiko (Reboot, Hapus Log, Tambah Pengguna, Edit Peran, Transfer FP) dibungkus pengecekan `hasPermission('...')` sehingga tidak tampil pada layar pengguna `viewer` atau `operator` tanpa izin.

---

## 5. Ringkasan API Endpoints Utama

- **Auth**: `POST /admin/login`, `POST /admin/logout`, `GET /admin/me`
- **User Management**: `GET /admin/users`, `POST /admin/users`, `PUT /admin/users/:id`, `DELETE /admin/users/:id`
- **Role & Permission Management**: `GET /admin/roles`, `GET /admin/permissions`, `POST /admin/roles`, `PUT /admin/roles/:id`, `DELETE /admin/roles/:id`
- **Device Operations**: `GET /admin/devices`, `PATCH /admin/devices/:sn`, `POST /admin/reboot`, `POST /admin/clear-log`
- **Attendance & Logs**: `GET /admin/attendance`, `GET /admin/stats`
- **Fingerprint Biometrics**: `POST /admin/enroll-fingerprint`, `POST /admin/transfer-fingerprint`, `GET /admin/fingerprint-check`
