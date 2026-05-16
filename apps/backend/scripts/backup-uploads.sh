#!/bin/bash
# Backup Uploads directory

UPLOADS_DIR="./uploads"
BACKUP_DIR="/var/backups/uploads"
TIMESTAMP=$(date +"%F_%T")

mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" -C "." "$UPLOADS_DIR"

echo "Uploads backup completed: $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"

# Keep last 7 days
find "$BACKUP_DIR" -type f -mtime +7 -name '*.tar.gz' -exec rm {} +
