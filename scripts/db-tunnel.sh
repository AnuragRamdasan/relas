#!/bin/bash

# Database SSH tunnel script for secure PostgreSQL access
# Usage: ./scripts/db-tunnel.sh [server-ip]

SERVER_IP="${1:-YOUR_SERVER_IP}"
LOCAL_PORT="5433"
REMOTE_PORT="5432"

if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
    echo "❌ Please provide your server IP address"
    echo "Usage: $0 <server-ip>"
    echo "Example: $0 123.45.67.89"
    exit 1
fi

echo "🔗 Creating SSH tunnel to PostgreSQL database..."
echo "Server: $SERVER_IP"
echo "Local port: $LOCAL_PORT"
echo "Remote port: $REMOTE_PORT"
echo ""
echo "📋 Database connection details:"
echo "Host: localhost"
echo "Port: $LOCAL_PORT"
echo "Database: relas_db"
echo "Username: relas_user"
echo "Password: [check your server's .env file]"
echo ""
echo "🔧 To get the password, run on your server:"
echo "   grep POSTGRES_PASSWORD .env"
echo ""
echo "⚡ Starting tunnel... (Press Ctrl+C to stop)"
echo ""

# Create SSH tunnel
ssh -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} relas@${SERVER_IP} \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -N