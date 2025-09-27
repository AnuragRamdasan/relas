#!/bin/bash

# Quick fix script for domain configuration issues
set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <your-domain.com>"
    echo "   Example: $0 myapp.example.com"
    exit 1
fi

DOMAIN=$1
echo "🔧 Fixing domain configuration for: $DOMAIN"
echo ""

# Check if nginx config exists
if [ ! -f "./nginx/sites/relas.conf" ]; then
    echo "❌ Nginx config file not found: ./nginx/sites/relas.conf"
    exit 1
fi

# Backup original config
echo "📁 Creating backup of nginx config..."
cp ./nginx/sites/relas.conf ./nginx/sites/relas.conf.backup

# Replace domain placeholders
echo "🔄 Updating domain in nginx config..."
sed -i "s/your-domain\.com/$DOMAIN/g" ./nginx/sites/relas.conf

# Check if .env file needs updating
if [ -f ".env" ]; then
    echo "🔄 Updating domain in .env file..."
    sed -i "s/your-domain\.com/$DOMAIN/g" .env
fi

# Restart nginx to apply changes
echo "🔄 Restarting nginx container..."
docker-compose restart nginx

# Wait a moment and check status
sleep 5
echo "📊 Checking nginx status..."
if docker-compose ps nginx | grep -q "Up"; then
    echo "✅ Nginx is now running!"
else
    echo "❌ Nginx still having issues. Check logs:"
    docker-compose logs --tail=10 nginx
fi

echo ""
echo "🌐 Your application should now be accessible at:"
echo "   HTTP:  http://$DOMAIN"
echo ""
echo "⚠️  For HTTPS, you still need to run SSL setup:"
echo "   sudo ./deployment/scripts/ssl-setup.sh $DOMAIN"
echo ""
echo "🔍 To test without domain, try:"
echo "   http://$(curl -s ifconfig.me):3000"