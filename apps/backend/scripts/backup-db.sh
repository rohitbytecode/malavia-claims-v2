#!/bin/bash
# Backup MongoDB database

BACKUP_DIR="/var/backups/mongodb"
TIMESTAMP=$(date +"%F_%T")
DB_URI=${MONGO_URI:-"mongodb://localhost:27017/hicms"}

mkdir -p "$BACKUP_DIR"

mongodump --uri="$DB_URI" --out="$BACKUP_DIR/backup_$TIMESTAMP"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "backup_$TIMESTAMP"

# Remove uncompressed folder
rm -rf "$BACKUP_DIR/backup_$TIMESTAMP"

echo "Database backup completed: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# Optional: keep only last 7 days of backups
find "$BACKUP_DIR" -type f -mtime +7 -name '*.tar.gz' -exec rm {} +
