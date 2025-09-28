#!/bin/bash

# Fast deployment script that skips database migrations
# Use this when you're sure no database changes are needed

set -e

echo "⚡ Fast Deployment (No DB Migrations)"
echo "====================================="
echo ""

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

# Clean up nginx configuration to prevent conflicts
echo "🧹 Cleaning nginx configuration..."
find ./nginx/sites/ -name "*.backup*" -type f -delete 2>/dev/null || true
find ./nginx/sites/ -name "*~" -type f -delete 2>/dev/null || true
find ./nginx/sites/ -name "*.tmp" -type f -delete 2>/dev/null || true

# Remove any other .conf files to prevent conflicts
find ./nginx/sites/ -name "*.conf" -not -name "relas.conf" -type f -delete 2>/dev/null || true

# Build and start services
echo "🏗️ Building application..."
docker-compose build --no-cache app

echo "🔄 Restarting application..."
docker-compose restart app

# Wait for app to be ready
echo "⏳ Waiting for application to start..."
sleep 15

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    
    # Test if nginx is actually responding
    echo "🔍 Testing nginx connectivity..."
    if docker-compose exec -T app curl -s http://nginx:80 > /dev/null 2>&1; then
        echo "✅ Nginx is responding to requests!"
    else
        echo "⚠️  Nginx is running but may not be responding properly"
        echo "Recent nginx logs:"
        docker-compose logs --tail=10 nginx
    fi
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
echo "⚡ Fast deployment complete!"
echo ""

# Check if using Cloudflare config
if grep -q "CF-Connecting-IP" "./nginx/sites/relas.conf"; then
    echo "🌐 Cloudflare configuration detected!"
    echo "🔗 Your application should be available at:"
    DOMAIN=$(grep -o 'server_name [^;]*' ./nginx/sites/relas.conf | head -1 | awk '{print $2}' || echo "your-domain.com")
    echo "   HTTPS: https://$DOMAIN"
    echo ""
    echo "⚠️  Important: Ensure Cloudflare is properly configured:"
    echo "   1. DNS records are proxied (orange cloud)"
    echo "   2. SSL/TLS mode is set to 'Flexible'"
    echo "   3. 'Always Use HTTPS' is enabled"
else
    echo "🔗 Your application should be available at:"
    echo "   HTTP:  http://$(curl -s ifconfig.me)"
    echo "   HTTPS: https://your-domain.com (after SSL setup)"
fi
echo ""
echo "📋 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Run migrations:   ./deployment/scripts/migrate.sh"
echo "   Full deploy:      ./deployment/scripts/deploy.sh"
echo ""
echo "⚠️  Note: Database migrations were SKIPPED in this fast deployment"
echo "   If you have schema changes, run: ./deployment/scripts/migrate.sh"