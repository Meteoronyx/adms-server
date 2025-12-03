# dbspot - ADMS Server (Modular Stack)

HTTP Backend Server untuk menangani komunikasi dengan mesin absensi iClock/ZKTeco menggunakan protokol PUSH SDK (ADMS).

[![Node.js](https://img.shields.io/badge/Node.js-%5E20-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-purple)](https://postgresql.org)

## Fitur
- Device Handshake & Initialization
- Real-time Attendance Log Receiver (ATTLOG)
- Heartbeat & Connectivity Monitoring
- Time Synchronization
- Device Information Management
- Bulk Insert untuk high-volume logs (20k+/hari)

## Tech Stack
- **Runtime**: Node.js ^20
- **Framework**: Express.js
- **DB**: PostgreSQL + `pg` pool
- **Middleware**: Custom raw-body parser
- **No ORM**: Raw SQL untuk performance

## 🗂️ Struktur Folder (Updated)
```
dbspot/
├── src/
│   ├── server.js              # Express app setup & server start
│   ├── config/                # Configs
│   │   ├── constants.js       # DB creds, ADMS constants
│   │   └── index.js           # Config export
│   ├── db/                    # Database layer
│   │   ├── connection.js      # pg Pool init
│   │   └── queries.js         # SQL functions (ATTLOG insert, etc.)
│   ├── middleware/            # Custom middleware
│   │   └── rawBodyParser.js   # Parse text/plain payloads
│   ├── routes/                # API routes
│   │   └── iclock.js          # /iclock/* endpoints (cdata, getrequest)
│   ├── services/              # Business logic
│   │   ├── deviceService.js   # Handshake, info, sync
│   │   └── attendanceService.js # ATTLOG processing & DB save
│   └── utils/                 # Helpers
│       └── parsers.js         # Parse ADMS payloads (tab-separated)
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── setup_tables.sql           # DB schema (users, attlogs, devices)
└── simulator.js               # Test client
```

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment (.env)
Buat file `.env` di root:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/dbspot
```

### 3. Database Setup
- Buat database PostgreSQL `dbspot`
- Jalankan schema:
```bash
psql -d dbspot -f setup_tables.sql
```

### 4. Run Server
```bash
npm start
# atau development dengan nodemon
npm run dev
```

### 5. Test dengan Simulator
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

## Visual Diagrams (Next)
- Architecture flow
- Data processing sequence
- (akan ditambahkan via Excalidraw)

## License
ISC
