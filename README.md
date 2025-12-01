# ADMS Server (Simplified Stack)

HTTP Backend Server untuk menangani komunikasi dengan mesin absensi (Fingerprint/Face ID) menggunakan protokol PUSH SDK (ADMS).

## Fitur
- Device Handshake (Initialization)
- Real-time Attendance Log Receiver (ATTLOG)
- Heartbeat & Connectivity Monitoring
- Time Synchronization
- Device Information Management

## Teknologi
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL dengan native `pg` driver
- **Connection Pooling**: Built-in pg pool
- **Raw Body Parser**: `raw-body` untuk text/plain parsing

## Struktur Folder Sederhana
```
dbspot/
├── src/
│   ├── server.js          # Entry point & routes
│   ├── db.js              # Database connection pool
│   ├── queries.js         # Raw SQL queries
│   └── handlers.js        # Request handlers
├── package.json
├── .env
├── setup_tables.sql       # Database schema
├── simulator.js           # Client simulator
└── README.md
```

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
- Buat database PostgreSQL
- Set `DATABASE_URL` di file `.env`
- Jalankan SQL migration:
```bash
# Gunakan psql atau import file SQL
psql -d your_database -f setup_tables.sql
```

### 3. Run Server
```bash
npm start
# atau untuk development
npm run dev
```

### 4. Test dengan Simulator
```bash
node simulator.js
```

## API Endpoints

### Handshake & Configuration
```
GET /iclock/cdata?SN={DeviceSN}&options=all&pushver={ver}
```
Response: Plain text dengan format ADMS

### Attendance Logs
```
POST /iclock/cdata?SN={DeviceSN}&table=ATTLOG&Stamp={Timestamp}
Content-Type: text/plain
```
Payload: `{UserPIN}\t{Time}\t{Status}\t{VerifyMode}\t{Validation}\t{WorkCode}`
Response: `OK`

### Heartbeat
```
GET /iclock/getrequest?SN={DeviceSN}
```
Response: `OK` atau `C:{ID}:{COMMAND_STRING}`

### Time Synchronization
```
GET /iclock/cdata?SN={DeviceSN}&type=time
```
Response: `Time=YYYY-MM-DDThh:mm:ss`

## Performance Optimizations
- **Bulk Insert** untuk attendance logs (bukan individual upsert)
- **Connection Pooling** dengan 20 connections
- **Database Indexes** untuk query performance
- **Raw SQL** tanpa ORM overhead

## Untuk 20k Log/Hari
- Puncak jam 16:30: ~3,300 log/jam ≈ 0.9 log/detik
- Bulk insert handling untuk batch processing
- Connection pool cukup untuk handle concurrent requests

## License
ISC
