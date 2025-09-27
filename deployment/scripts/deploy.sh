#!/bin/bash

# Deployment script for Relationship Assistant
# Run this script from the application directory as the relas user

set -e

echo "🚀 Deploying Relationship Assistant..."

# Check if running as relas user
if [ "$USER" != "relas" ]; then
    echo "❌ This script must be run as the 'relas' user"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.production.example"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running or accessible"
    exit 1
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Build and start services
echo "🏗️ Building application..."
docker-compose build --no-cache

echo "🔧 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy

# Generate Prisma client (if needed)
echo "🔧 Generating Prisma client..."
docker-compose exec -T app npx prisma generate

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
else
    echo "❌ Some services failed to start"
    docker-compose logs --tail=50
    exit 1
fi

# Show running containers
echo ""
echo "📊 Running containers:"
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Your application should be available at:"
echo "   HTTP:  http://$(curl -s ifconfig.me)"
echo "   HTTPS: https://your-domain.com (after SSL setup)"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart app:   docker-compose restart app"
echo "   Stop all:      docker-compose down"
echo "   Update app:    ./deployment/scripts/deploy.sh"