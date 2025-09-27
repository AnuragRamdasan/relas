#!/bin/bash

# Database backup script for Relationship Assistant
# Run this script to create a backup of your PostgreSQL database

set -e

BACKUP_DIR="/home/relas/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="relas_production"
BACKUP_FILE="$BACKUP_DIR/relas_backup_$DATE.sql"

echo "💾 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
docker-compose exec -T postgres pg_dump -U relas_user $DB_NAME > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "relas_backup_*.sql.gz" -mtime +30 -delete

echo "🧹 Cleaned up old backups (keeping last 30 days)"

# Show backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "📊 Backup size: $BACKUP_SIZE"