# Dokumentasi API new-DBSPOT

Dokumen ini berisi referensi lengkap untuk API komunikasi perangkat (Device Protocol) dan manajemen admin (Admin API).

**Daftar Isi**
1. [Protokol Perangkat (Device Protocol)](#1-protokol-perangkat-device-protocol)
2. [API Admin](#2-api-admin)
   - [Manajemen Perangkat](#manajemen-perangkat)
   - [Perintah Perangkat](#perintah-perangkat)
   - [Manajemen Pengguna & Sidik Jari](#manajemen-pengguna--sidik-jari)

---

## 1. Protokol Perangkat (Device Protocol)
Endpoint ini digunakan oleh mesin absensi (fingerprint) untuk berkomunikasi dengan server. Base path: `/iclock`.

### Handshake & Konfigurasi
Digunakan perangkat untuk inisialisasi dan mengambil konfigurasi server.
```
GET /iclock/cdata?SN={DeviceSN}&options=all&pushver={ver}
```
**Respon**: `GET OPTION FROM: {DeviceSN} ......` (Daftar konfigurasi perangkat)

### Pengiriman Log Presensi (ATTLOG)
Perangkat mengirimkan data log kehadiran ke server.
```
POST /iclock/cdata?SN={DeviceSN}&table=ATTLOG&Stamp=9999
Content-Type: text/plain
```
**Payload**: `{UserPIN}\t{Time}\t{Status}\t{VerifyMode}\t{Validation}\t{WorkCode}`
**Respon**: `OK`

### Heartbeat 
Perangkat mengirim heartbeat berkala untuk mengecek koneksi dan mengambil perintah server.
```
GET /iclock/getrequest?SN={DeviceSN}
```
**Respon**: 
- `OK` (Jika tidak ada perintah)
- `C:{ID}:{COMMAND_STRING}` (Jika ada perintah yang harus dieksekusi)

### Sinkronisasi Waktu
Perangkat meminta waktu server untuk sinkronisasi.
```
GET /iclock/cdata?SN={DeviceSN}&type=time
```
**Respon**: `Time=YYYY-MM-DDThh:mm:ss`

---

## 2. API Admin
Digunakan untuk mengelola perangkat dan data.

**Base URL**: `/admin`
**Autentikasi**: Header `x-api-key: {YOUR_API_KEY}`

### Manajemen Perangkat

#### Mendapatkan Semua Perangkat
```
GET /admin/devices
```
Mengambil daftar semua perangkat terdaftar.
**Respon**:
```json
{
  "success": true,
  "devices": [
    { "sn": "SN123", "name": "Device A", "status": "online", "last_activity": "..." }
  ]
}
```

#### Verifikasi Perangkat
Menandai perangkat sebagai "verified" agar log presensinya diterima dan waktu sinkron.
```
POST /admin/verify/:sn
DELETE /admin/verify/:sn  (Batal Verifikasi)
```

#### Reupload Log Presensi
Meminta perangkat mengunggah ulang seluruh log presensi dan fingerprint
```
POST /admin/reupload/:sn
```

#### Cek Antrean Reupload
```
GET /admin/reupload/queue
```

### Perintah Perangkat (Device Commands)
Mengirim perintah remote ke perangkat. Perintah akan dieksekusi saat heartbeat berikutnya.

#### Hapus Log (Clear Log)
Menghapus seluruh log presensi di perangkat.
```
POST /admin/clearlog/:sn
```

#### Info Perangkat
Meminta detail informasi perangkat.
```
POST /admin/info/:sn
```

#### Reboot
Merestart perangkat.
```
POST /admin/reboot/:sn
```

#### Cek Antrean Perintah
```
GET /admin/commands/queue
```

### Manajemen Pengguna & Sidik Jari

#### List Pegawai di Perangkat
Melihat siapa saja yang terdaftar di mesin tertentu.
```
GET /admin/devices/:sn/pegawai
```

#### Detail Pegawai & Sidik Jari
Melihat detail pegawai beserta data sidik jari mereka (tersebar di mesin mana saja).
```
GET /admin/pegawai/:pin
```

#### Cek Sidik Jari pada Perangkat
Mengecek template sidik jari spesifik di suatu perangkat.
```
GET /admin/fingerprint-check?pin={PIN}&sn={SN}
```

#### Transfer Sidik Jari (Copy Fingerprint)
Menyalin sidik jari dari satu mesin (sumber) ke mesin lain (tujuan).
```
POST /admin/transferfp/:target_sn
```
**Body**:
```json
{
  "pin": 12345,
  "source_sn": "SOURCE_SN"
}
```

#### Pendaftaran Sidik Jari (Enroll)
Meminta perangkat masuk mode pendaftaran jari untuk user tertentu.
```
POST /admin/enrollfp/:sn
```
**Body**:
```json
{
  "pin": 12345,
  "fid": 0,       // Indeks Jari 0-9 (dimulai dari kelingking kiri)
  "retry": 1,     // Jumlah percobaan
  "overwrite": 0  // Timpa jika ada?
}
```

#### Update Info/Privilege User
Mengubah password atau hak akses (Admin/User).
```
POST /admin/user/:sn
```
**Body**:
```json
{
  "pin": 12345,
  "privilege": 14, // 14=Admin, 0=User
  "passwd": "123"  // 0 = hapus password
}
```

#### Hapus User
Menghapus user dari perangkat.
```
DELETE /admin/user/:sn/:pin
```
