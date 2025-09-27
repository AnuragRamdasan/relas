#!/bin/bash

# SSL Certificate Setup with Let's Encrypt
# Run this script after your domain is pointing to the server

set -e

# Check if domain is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <your-domain.com>"
    echo "Example: $0 relationshipassistant.com"
    exit 1
fi

DOMAIN=$1
EMAIL="admin@$DOMAIN"

echo "🔐 Setting up SSL certificate for $DOMAIN..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Install certbot nginx plugin
apt update
apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
echo "⏸️ Stopping nginx temporarily..."
docker-compose -f /home/relas/app/docker-compose.yml stop nginx

# Create webroot directory for certbot
mkdir -p /var/www/certbot

# Get SSL certificate
echo "📜 Obtaining SSL certificate..."
certbot certonly \
    --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN,www.$DOMAIN

# Update nginx configuration with the actual domain
echo "🔧 Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" /home/relas/app/nginx/sites/relas.conf

# Start nginx again
echo "▶️ Starting nginx..."
docker-compose -f /home/relas/app/docker-compose.yml start nginx

# Test SSL certificate
echo "🧪 Testing SSL certificate..."
if curl -s -I https://$DOMAIN | grep -q "200 OK"; then
    echo "✅ SSL certificate is working correctly!"
else
    echo "⚠️ SSL test failed. Check your configuration."
fi

# Set up auto-renewal
echo "🔄 Setting up auto-renewal..."
cat > /etc/cron.d/certbot-renew << EOF
# Renew Let's Encrypt certificates
0 2 * * * root certbot renew --quiet --post-hook "docker-compose -f /home/relas/app/docker-compose.yml restart nginx"
EOF

echo "✅ SSL setup complete!"
echo ""
echo "🔒 Your site is now available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "🔄 SSL certificates will auto-renew every day at 2 AM"