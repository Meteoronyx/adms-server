# ADMS-Server

Server ADMS (Automatic Data Master Server) berbasis Node.js untuk pengelolaan mesin absensi ZKTeco (push protocol) dan manajemen data kehadiran secara realtime.

[![Node.js](https://img.shields.io/badge/Node.js-%5E20-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-purple)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

## Fitur Utama
- **Device Handshake**: Inisialisasi koneksi otomatis dengan mesin.
- **Real-time Attendance**: Menerima log kehadiran (ATTLOG) secara langsung saat terjadi scan.
- **Device Management**: Manajemen status perangkat (Online/Offline), info perangkat, dan verifikasi.
- **Remote Commands**: Kirim perintah jarak jauh (Reboot, Clear Log, Info).
- **Fingerprint Management**: Manajemen sidik jari (Upload, Download, Transfer antar mesin).
- **Resilience**: Fitur re-upload log dan sinkronisasi waktu otomatis.

## Dokumentasi API
Dokumentasi lengkap mengenai protokol perangkat dan API Admin tersedia di folder `docs`:
 **[Dokumentasi API Lengkap (docs/api.md)](docs/api.md)**

## Tech Stack
- **Runtime**: Node.js ^20
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (Docker)
- **Containerization**: Docker & Docker Compose

## Struktur Folder
```
dbspot/
├── migrations/                # Script database migrations
├── src/
│   ├── config/                # Konfigurasi (ENV, Konstanta)
│   ├── db/                    # Koneksi & Query Database
│   ├── routes/                # Rute API (/iclock, /admin)
│   ├── services/              # Logika Bisnis (Device, Attendance, Command)
│   └── utils/                 # Utilities (Logger, Parsers)
├── docs/                      # Dokumentasi 
├── backup.sh                  # Script backup otomatis
├── restore.sh                 # Script restore otomatis
└── simulator.js               # Script simulator untuk testing
```

## Instalasi dengan Docker (Direkomendasikan)

### 1. Prasyarat
- Docker dan Docker Compose terinstall di mesin Anda.

### 2. Konfigurasi Environment (.env)
Salin `.env.example` menjadi `.env` dan sesuaikan nilainya:
```bash
cp .env.example .env
```
Pastikan variabel database berikut terisi:
```env
POSTGRES_USER=dbspot_user
POSTGRES_PASSWORD=dbspot_pass
POSTGRES_DB=dbspot
ADMIN_API_KEY=your-custom-api-key
```

### 3. Menjalankan Aplikasi
Gunakan Docker Compose untuk membangun dan menjalankan seluruh layanan:
```bash
docker compose up -d --build
```
Aplikasi akan berjalan di port `3000`. Database akan otomatis terinisialisasi dan menjalankan migrasi saat pertama kali dijalankan.

---

## Backup & Restore

Project ini dilengkapi dengan script untuk mempermudah migrasi antar server atau pencadangan data.

### Backup Data
Jalankan script `backup.sh` untuk mencadangkan database dan file project:
```bash
./backup.sh
```
File hasil backup (`.tar.gz`) akan tersimpan di folder `backups/`.

### Restore Data
Pindahkan file backup ke server baru, ekstrak, lalu jalankan script `restore.sh`:
```bash
./restore.sh
```
Script ini akan merestore database ke dalam container PostgreSQL dan menjalankan aplikasi kembali.

---

## Instalasi Manual (Tanpa Docker)

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Setup Database
- Buat database PostgreSQL bernama `dbspot`.
- Jalankan migrasi:
```bash
npm run migrate
```

### 3. Menjalankan Server
```bash
npm run dev   # Development
npm start     # Production
```

## Support
Jika Anda merasa project ini bermanfaat, Anda bisa memberikan dukungan melalui Ko-fi:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/meteoronyx)

Untuk pertanyaan atau support via QRIS, silakan hubungi: **ardian@sgbteam.id**
