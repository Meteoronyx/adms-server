# new-DBSPOT

Server ADMS (Automatic Data Master Server) berbasis Node.js untuk pengelolaan mesin absensi ZKTeco (push protocol) dan manajemen data kehadiran secara realtime.

[![Node.js](https://img.shields.io/badge/Node.js-%5E20-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-purple)](https://postgresql.org)

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
- **Database**: PostgreSQL (dengan `pg` pool)

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
└── simulator.js               # Script simulator untuk testing
```

## Instalasi

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment (.env)
Buat file `.env` di root folder dan sesuaikan konfigurasi:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbspot
ADMIN_API_KEY=your-custom-api-key
```

### 3. Setup Database
- Buat database PostgreSQL bernama `dbspot`.
- Jalankan migrasi untuk membuat tabel:
```bash
npm run migrate
```
*Gunakan `npm run migrate:down` untuk membatalkan (rollback).*

### 4. Menjalankan Server
Mode Development (dengan hot-reload):
```bash
npm run dev
```
Mode Production:
```bash
npm start
```

### 5. Testing dengan Simulator
Anda dapat menggunakan script simulator untuk meniru perilaku mesin absensi:
```bash
node simulator.js
```

## Deployment (PM2)
Untuk environemnt produksi, disarankan menggunakan PM2.

```bash
# Instal Global PM2
npm install -g pm2

# Jalankan Service
pm2 start ecosystem.config.js --env production

# Monitoring
pm2 monit
pm2 logs dbspot
```