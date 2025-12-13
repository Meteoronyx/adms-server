# dbspot - ADMS Server
ADMS Server

[![Node.js](https://img.shields.io/badge/Node.js-%5E20-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-purple)](https://postgresql.org)

## Features
- Device Handshake & Initialization
- Real-time Attendance Log Receiver (ATTLOG)
- Heartbeat
- Time Synchronization
- Device Information Management
- Reupload Attendance Logs

## Tech Stack
- **Runtime**: Node.js ^20
- **Framework**: Express.js
- **DB**: PostgreSQL + `pg` pool
- **RAW SQL**

## Folder Structure
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
│   │   └── apiKeyAuth.js      # API key authentication
│   ├── routes/                # API routes
│   │   └── admin.js           # /admin/* endpoints (reupload, queue)
│   │   └── iclock.js          # /iclock/* endpoints (cdata, getrequest)
│   ├── services/              # Business logic
│   │   ├── deviceService.js   # Handshake, info, sync
│   │   └── attendanceService.js # ATTLOG processing & DB save
│   │   └── reuploadService.js  # Reupload logic
│   └── utils/                 # Helpers
│       └── parsers.js         # Parse ADMS payloads (tab-separated)
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── setup_tables.sql           # DB schema (users, attlogs, devices)
└── simulator.js               # Test client
```

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment (.env)
Create file `.env` in root:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/dbspot
ADMIN_API_KEY=your_admin_api_key
```

### 3. Database Setup
- Create database PostgreSQL `dbspot`
- Run schema:
```bash
psql -d dbspot -f setup_tables.sql
```

### 4. Run Server
```bash
npm start
npm run dev
```

### 5. Test using Simulator
```bash
node simulator.js
```

## PM2 Production Deployment (Recommended)
Install PM2: `npm install -g pm2`

Run:
- Dev: `pm2 start ecosystem.config.js`
- Prod: `pm2 start ecosystem.config.js --env production`

Commands:
- `pm2 monit` : Dashboard monitoring
- `pm2 logs dbspot` : Tail logs
- `pm2 reload dbspot` : Zero-downtime restart
- `pm2 stop/restart/delete dbspot`
- Boot auto-start: `pm2 startup && pm2 save`

## API Endpoints

### Handshake & Configuration
```
GET /iclock/cdata?SN={DeviceSN}&options=all&pushver={ver}
```
Response: Plain text dengan format ADMS

### Attendance Logs
```
POST /iclock/cdata?SN={DeviceSN}&table=ATTLOG&Stamp=9999
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

### Admin API
```
POST /admin/reupload
```
Payload: `{SN: "DeviceSN"}`
Response: `OK`

```
GET /admin/reupload/queue
```
Response: `{"success": true,"queue": {"ABC123456": {"queuedAt": "2025-12-13T03:08:48.423Z"}}}`