#!/bin/bash

# Database backup script for Relationship Assistant
# Run this script to create a backup of your SQLite database

set -e

BACKUP_DIR="/home/relas/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="/app/data/production.db"
BACKUP_FILE="$BACKUP_DIR/relas_backup_$DATE.db"

echo "💾 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create database backup (simple file copy for SQLite)
cp "$DB_FILE" "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Clean up old backups (keep last 30 days)
find $BACKUP_DIR -name "relas_backup_*.db.gz" -mtime +30 -delete

echo "🧹 Cleaned up old backups (keeping last 30 days)"

# Show backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "📊 Backup size: $BACKUP_SIZE"

echo ""
echo "💡 To restore from backup:"
echo "   gunzip ${BACKUP_FILE}.gz"
echo "   cp ${BACKUP_FILE} /app/data/production.db"