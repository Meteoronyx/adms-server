#!/bin/bash
# script: backup.sh

echo "========================================="
echo "  Memulai proses backup DBSpot"
echo "========================================="

cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "[Error] File .env tidak ditemukan! Pastikan Anda berada di direktori DBSpot."
    exit 1
fi

POSTGRES_USER=$(grep "^POSTGRES_USER=" .env | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
POSTGRES_DB=$(grep "^POSTGRES_DB=" .env | cut -d '=' -f 2- | tr -d '"' | tr -d "'")

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "[Error] Gagal membaca POSTGRES_USER atau POSTGRES_DB dari .env."
    exit 1
fi

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/dbspot_backup_${BACKUP_DATE}.tar.gz"
DB_DUMP_FILE="db_backup_${BACKUP_DATE}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[1/4] Mematikan aplikasi (app) agar tidak ada data baru yang masuk..."
docker compose stop app

echo "[2/4] Melakukan dump database PostgreSQL (Format Custom)..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER}" -F c -d "${POSTGRES_DB}" > "${DB_DUMP_FILE}"

if [ $? -eq 0 ]; then
    echo "      -> Dump database berhasil dibuat: ${DB_DUMP_FILE}"
else
    echo "      -> [Error] Gagal melakukan dump database! Apakah container 'db' sedang berjalan?"
    rm -f "${DB_DUMP_FILE}"
    docker compose start app
    exit 1
fi

echo "[3/4] Membuat arsip (tar.gz) dari seluruh file project..."
tar -czvf "${BACKUP_FILE}" \
    --exclude="node_modules" \
    --exclude="frontend/node_modules" \
    --exclude=".git" \
    --exclude="${BACKUP_DIR}" \
    . > /dev/null

echo "[4/4] Membersihkan file dump sementara..."
rm -f "${DB_DUMP_FILE}"

echo "========================================="
echo " Backup Selesai!"
echo " File hasil backup : ${BACKUP_FILE}"
echo " Ukuran file       : $(du -sh "${BACKUP_FILE}" | cut -f1)"
echo " "
echo " Pindahkan file tar.gz tersebut ke VM baru,"
echo " lalu ekstrak dan jalankan ./restore.sh"
echo "========================================="
