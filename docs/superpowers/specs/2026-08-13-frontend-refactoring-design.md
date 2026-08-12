# Frontend Modular Refactoring & Visual Polish Design Document

**Date:** 2026-08-13  
**Status:** Draft / Proposed  
**Author:** AI Pair Programmer  

---

## 1. Executive Summary

Aplikasi frontend `dbspot` telah berkembang secara signifikan dengan fitur-fitur baru seperti **Multi-User Authentication**, **RBAC (Role-Based Access Control)**, dan **Device Command Management**. Namun, berkembangnya fitur tersebut menyebabkan penurunan kemudahan pemeliharaan (*maintainability*) karena beberapa file halaman utama bersifat monolitik:
- [Users.jsx](file:///home/ubuntu/dbspot/frontend/src/pages/Users.jsx): **1,207 baris** (Menggabungkan state user, role, permission category parser, 6 modal dialog, form validation, filter & search, serta UI rendering).
- [DeviceDetail.jsx](file:///home/ubuntu/dbspot/frontend/src/pages/DeviceDetail.jsx): **600+ baris** (Menggabungkan detail perangkat, command modal, pegawai list, push user modal, dan socket sync).

Dokumen ini mendesain refactoring arsitektur frontend menjadi **Feature-Based Architecture** dengan pemisahan logika ke **Custom React Hooks** murni serta **Visual UI Polish** sesuai standar *frontend design*.

---

## 2. High-Level Architecture & Principles

```
frontend/src/
├── components/           # Reusable Design System / Primitives
│   ├── ui/
│   │   ├── Badge.jsx      # [NEW] Standardized status & role badges
│   │   ├── Tabs.jsx       # [NEW] Accessible animated tab switching
│   │   ├── Modal.jsx      # [MODIFY] Refined backdrop & animation
│   │   └── ...
├── features/             # Business Logic & Feature Modules
│   ├── users/
│   │   ├── hooks/         # Feature State & API logic hooks
│   │   │   ├── useUsers.js
│   │   │   ├── useRoles.js
│   │   │   └── useUserModals.js
│   │   └── components/    # Feature UI & Sub-modals
│   │       ├── UsersTab.jsx
│   │       ├── RolesTab.jsx
│   │       └── modals/
│   │           ├── CreateUserModal.jsx
│   │           ├── EditUserModal.jsx
│   │           ├── ResetPasswordModal.jsx
│   │           ├── DeleteUserModal.jsx
│   │           ├── RoleModal.jsx
│   │           └── DeleteRoleModal.jsx
│   └── devices/
│       ├── hooks/
│       │   ├── useDevices.js
│       │   └── useDeviceDetail.js
│       └── components/
│           ├── DeviceDetailHeader.jsx
│           ├── DevicePegawaiTab.jsx
│           └── modals/
│               ├── DeviceCommandModal.jsx
│               └── PushUserModal.jsx
└── pages/                 # Pure Page Orchestrators (< 100 baris)
    ├── Users.jsx
    ├── DeviceDetail.jsx
    └── ...
```

### Core Design Principles:
1. **Feature Encapsulation**: Seluruh logika, modal, dan sub-komponen yang hanya digunakan oleh fitur tertentu tinggal di dalam `src/features/<feature_name>/`.
2. **Separation of Concerns**:
   - **Page Orchestrator** ([Users.jsx](file:///home/ubuntu/dbspot/frontend/src/pages/Users.jsx)): Hanya mengatur tab utama dan menghubungkan custom hooks ke sub-komponen.
   - **Custom Hooks** (`useUsers`, `useRoles`, `useUserModals`): Mengelola state data, async API call, filter/search state, error handling, dan status modal.
   - **Presentational Sub-components**: Komponen UI murni yang menerima data & handler via props, tanpa megastate monolitik.
3. **Visual Excellence**:
   - Transisi tab yang halus (*smooth tab switching*).
   - Penggunaan visual badge yang konsisten untuk role & permission badges.
   - UI polish pada header & footer modal dialog.

---

## 3. Detailed Component & Hook Specifications

### 3.1 Feature: `users` (`src/features/users/`)

#### A. Custom Hooks
1. **`useUsers.js`**
   - **State**: `users`, `loading`, `search`, `roleFilter`.
   - **Actions**: `fetchUsers()`, `createUser(data)`, `updateUser(id, data)`, `resetPassword(id, pass)`, `deleteUser(id)`.
   - **Computed**: `filteredUsers` (berdasarkan `search` dan `roleFilter`).
2. **`useRoles.js`**
   - **State**: `roles`, `permissions`, `permissionCategories`, `loading`.
   - **Actions**: `fetchRoles()`, `createRole(data)`, `updateRole(id, data)`, `deleteRole(id)`.
3. **`useUserModals.js`**
   - **State**: Control flag & target item untuk 6 modal: `createUser`, `editUser`, `resetPassword`, `deleteUser`, `role` (Create/Edit), `deleteRole`.
   - **Actions**: `openModal(type, target)`, `closeModal(type)`.

#### B. Sub-components & Modals
- `UsersTab.jsx`: Toolbar pencarian, filter role dropdown, tombol "Tambah User", dan tabel daftar user.
- `RolesTab.jsx`: Header role, tombol "Tambah Role", grid kartu/tabel role dengan list permission badges.
- `modals/CreateUserModal.jsx`: Form pembuatan user baru dengan role picker.
- `modals/EditUserModal.jsx`: Form edit nama, role, dan status aktif.
- `modals/ResetPasswordModal.jsx`: Modal konfirmasi & input password baru.
- `modals/DeleteUserModal.jsx`: Modal konfirmasi hapus user.
- `modals/RoleModal.jsx`: Modal pembentukan/edit role lengkap dengan interactive checkbox grouping per kategori permission (System, Users, Devices, Attendance, Fingerprint).
- `modals/DeleteRoleModal.jsx`: Modal konfirmasi hapus role.

---

### 3.2 Feature: `devices` (`src/features/devices/`)

#### A. Custom Hooks
1. **`useDeviceDetail.js`**
   - **State**: `device`, `pegawaiList`, `loading`, `commandQueue`.
   - **Actions**: `fetchDeviceDetail(sn)`, `triggerCommand(type)`, `pushUser(data)`, `deleteUserFromDevice(pin)`.

#### B. Sub-components & Modals
- `DeviceDetailHeader.jsx`: Info status koneksi, IP, firmware, serial number, dan quick action bar (Reboot, Reupload, Info, Clear Log).
- `DevicePegawaiTab.jsx`: Tabel pegawai yang terdaftar pada perangkat beserta status fingerprint.
- `modals/DeviceCommandModal.jsx`: Modal konfirmasi eksekusi command pada perangkat.
- `modals/PushUserModal.jsx`: Form pengiriman data user/pegawai ke perangkat.

---

### 3.3 Design System Components (`src/components/ui/`)

1. **`Badge.jsx`**
   - Variant: `default`, `indigo`, `success`, `warning`, `danger`, `neutral`.
   - Icon support & pill style.
2. **`Tabs.jsx`**
   - Tab bar container dengan active pill highlight animation & keyboard navigation.
3. **`Modal.jsx` Refactor**
   - Memastikan backdrop blur `backdrop-blur-sm`, animasi entrance, dan slot `Header`, `Body`, `Footer` yang terstruktur.

---

## 4. Verification & Testing Plan

1. **Functional Verification**:
   - User Management: Test Create, Edit, Reset Password, Delete User.
   - Role & Permission Management: Test Create Role, Edit Role Permissions, Delete Role.
   - Device Details: Test command triggers, view pegawai, push user.
2. **Linting & Code Quality**:
   - Pastikan tidak ada lint errors dengan `npm run lint` di folder `frontend/`.
3. **Build Verification**:
   - Jalankan `npm run build` untuk memverifikasi tidak ada error sintaks atau bundling.

---
