#!/bin/bash

# Fix IP blocking issue in Cloudflare nginx config
set -e

echo "🔧 Fixing IP Blocking Issue"
echo "==========================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Run this script from the application root directory"
    exit 1
fi

echo "🔍 Current issue: Cloudflare IP whitelist is blocking all traffic"
echo "📋 Solution: Temporarily allow all IPs, then test"
echo ""

# Backup current config
echo "📁 Creating backup of current config..."
cp ./nginx/sites/relas.conf ./nginx/sites/relas.conf.blocked-backup
echo "✅ Backup saved as relas.conf.blocked-backup"
echo ""

# Create a temporary config without IP restrictions
echo "🔧 Creating temporary config without IP restrictions..."
cat > ./nginx/sites/relas.conf << 'EOF'
# Temporary HTTP-only configuration for testing
# Allows all traffic to debug connectivity issues

server {
    listen 80;
    server_name test.anuragramdasan.com www.test.anuragramdasan.com;
    
    # Security headers (basic)
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Main application
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location = /health {
        proxy_pass http://app:3000;
        access_log off;
    }

    # Static files
    location /_next/static/ {
        proxy_pass http://app:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon and robots
    location = /favicon.ico {
        proxy_pass http://app:3000;
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        proxy_pass http://app:3000;
        log_not_found off;
        access_log off;
    }
}
EOF

echo "✅ Created temporary open config"
echo ""

echo "🔄 Restarting nginx container..."
docker-compose restart nginx
echo ""

echo "⏳ Waiting for nginx to start..."
sleep 15
echo ""

echo "🔍 Testing connectivity..."
echo "Container status:"
docker-compose ps nginx
echo ""

# Test local connectivity
echo "Testing local access..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
    echo "✅ Local access works!"
else
    echo "❌ Local access still failing"
    echo "Nginx logs:"
    docker-compose logs --tail=5 nginx
fi
echo ""

# Test direct IP access
echo "Testing direct server IP access..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")
if [ "$SERVER_IP" != "unknown" ]; then
    echo "Server IP: $SERVER_IP"
    if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP | grep -q "200\|301\|302"; then
        echo "✅ Direct IP access works!"
    else
        echo "❌ Direct IP access failing"
    fi
else
    echo "⚠️  Could not determine server IP"
fi
echo ""

echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. ✅ Test your domain now: https://test.anuragramdasan.com"
echo ""
echo "2. 🔒 Once working, we can restore Cloudflare IP restrictions:"
echo "   cp ./nginx/sites/relas.conf.blocked-backup ./nginx/sites/relas.conf"
echo "   docker-compose restart nginx"
echo ""
echo "3. 🌐 For production, we'll update Cloudflare IP ranges properly"
echo ""
echo "📊 Current status:"
docker-compose ps
echo ""
echo "🔍 If still not working, check:"
echo "   - Cloudflare DNS settings (orange cloud enabled?)"
echo "   - Cloudflare SSL mode (should be 'Flexible')"
echo "   - Domain propagation (may take a few minutes)"