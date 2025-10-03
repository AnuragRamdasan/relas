#!/bin/bash

# Database access script for SQLite database
# Usage: ./scripts/db-access.sh [server-ip]

SERVER_IP="${1:-YOUR_SERVER_IP}"

if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
    echo "❌ Please provide your server IP address"
    echo "Usage: $0 <server-ip>"
    echo "Example: $0 123.45.67.89"
    exit 1
fi

echo "🗄️ Accessing SQLite database on remote server..."
echo "Server: $SERVER_IP"
echo ""
echo "📋 Database file location: /app/data/production.db"
echo ""
echo "🔧 To access the database, you can:"
echo "1. SSH into the server and use sqlite3:"
echo "   ssh relas@${SERVER_IP}"
echo "   cd /app && sqlite3 data/production.db"
echo ""
echo "2. Copy the database file locally:"
echo "   scp relas@${SERVER_IP}:/app/data/production.db ./production.db"
echo "   sqlite3 production.db"
echo ""
echo "3. Use Prisma Studio remotely:"
echo "   ssh relas@${SERVER_IP}"
echo "   cd /app && npx prisma studio"
echo ""
echo "⚡ Opening SSH connection... (Press Ctrl+C to exit)"
echo ""

# Create SSH connection
ssh relas@${SERVER_IP}