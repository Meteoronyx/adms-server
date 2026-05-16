#!/bin/bash
# script: restore.sh

echo "========================================="
echo "  Memulai proses restore DBSpot"
echo "========================================="

cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "[Error] File .env tidak ditemukan! Pastikan file backup diekstrak dengan benar."
    exit 1
fi

POSTGRES_USER=$(grep "^POSTGRES_USER=" .env | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
POSTGRES_DB=$(grep "^POSTGRES_DB=" .env | cut -d '=' -f 2- | tr -d '"' | tr -d "'")

DB_DUMP_FILE=$(ls db_backup_*.dump 2>/dev/null | head -n 1)

if [ -z "$DB_DUMP_FILE" ]; then
    echo "[Info] File dump (db_backup_*.dump) belum terekstrak. Mencari file arsip backup (.tar.gz)..."
    
    TAR_FILE=$(ls dbspot_backup_*.tar.gz 2>/dev/null | head -n 1)
    if [ -z "$TAR_FILE" ]; then
        TAR_FILE=$(ls backups/dbspot_backup_*.tar.gz 2>/dev/null | head -n 1)
    fi

    if [ -n "$TAR_FILE" ]; then
        echo "      -> Menemukan arsip: ${TAR_FILE}. Sedang mengekstrak otomatis..."
        tar -xzvf "${TAR_FILE}" ./db_backup_*.dump > /dev/null 2>&1 || tar -xzvf "${TAR_FILE}" > /dev/null 2>&1
        
        DB_DUMP_FILE=$(ls db_backup_*.dump 2>/dev/null | head -n 1)
        if [ -z "$DB_DUMP_FILE" ]; then
            echo "      -> [Error] Ekstrak selesai, tapi file dump tidak ditemukan di dalam arsip!"
            exit 1
        fi
    else
        echo "      -> [Error] File dump database (.dump) dan file arsip (.tar.gz) tidak ditemukan!"
        echo "         Pastikan Anda memiliki file backup sebelum menjalankan script ini."
        exit 1
    fi
fi

echo "[1/4] Menjalankan container database di background..."
docker compose up -d db

echo "      -> Menunggu database PostgreSQL siap (10 detik)..."
sleep 10

echo "[2/4] Merestore database dari ${DB_DUMP_FILE}..." 
docker compose exec -T db pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -1 < "${DB_DUMP_FILE}"

if [ $? -eq 0 ]; then
    echo "      -> Restore database berhasil."
else
    echo "      -> [Error] Gagal melakukan restore database!"
    exit 1
fi

echo "[3/4] Membersihkan file dump SQL setelah sukses restore..."
rm -f "${DB_DUMP_FILE}"

echo "[4/4] Menjalankan seluruh layanan (app & db)..."
docker compose up -d --build

echo "========================================="
echo " Restore Selesai!"
echo " Aplikasi Anda seharusnya sudah berjalan."
echo " Cek status container dengan: docker compose ps"
echo " Cek log dengan: docker compose logs -f"
echo "========================================="
