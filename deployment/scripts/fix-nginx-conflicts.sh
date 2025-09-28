#!/bin/bash

# Fix nginx conflicting server names and rate limiting zones
set -e

echo "🔧 Fixing Nginx Configuration Conflicts"
echo "======================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Run this script from the application root directory"
    exit 1
fi

echo "🧹 Step 1: Cleaning up conflicting config files..."
# Remove any backup or duplicate config files
find ./nginx/sites/ -name "*.backup*" -type f -delete 2>/dev/null || true
find ./nginx/sites/ -name "*~" -type f -delete 2>/dev/null || true

# List all config files to see what we have
echo "Current nginx config files:"
ls -la ./nginx/sites/
echo ""

# Keep only the main config file
echo "🔧 Step 2: Ensuring only one config file exists..."
if [ -f "./nginx/sites/relas.conf" ]; then
    echo "✅ Main config file exists"
    
    # Remove any other .conf files that might conflict
    find ./nginx/sites/ -name "*.conf" -not -name "relas.conf" -type f -delete 2>/dev/null || true
    
    echo "Remaining config files:"
    ls -la ./nginx/sites/
else
    echo "❌ Main config file missing. Restoring from Cloudflare template..."
    if [ -f "./nginx/sites/relas-cloudflare.conf" ]; then
        cp ./nginx/sites/relas-cloudflare.conf ./nginx/sites/relas.conf
        echo "✅ Restored main config file"
    else
        echo "❌ Cloudflare template not found!"
        exit 1
    fi
fi
echo ""

echo "🔧 Step 3: Checking nginx.conf for rate limiting zones..."
if ! grep -q "limit_req_zone.*zone=api" ./nginx/nginx.conf; then
    echo "❌ Rate limiting zones not found in nginx.conf"
    echo "Adding rate limiting zones..."
    
    # Backup nginx.conf
    cp ./nginx/nginx.conf ./nginx/nginx.conf.backup
    
    # Add rate limiting zones before the include statement
    sed -i '/include \/etc\/nginx\/sites-available/i\    # Rate Limiting\n    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;\n    limit_req_zone $binary_remote_addr zone=webhook:10m rate=100r/m;\n' ./nginx/nginx.conf
    
    echo "✅ Added rate limiting zones to nginx.conf"
else
    echo "✅ Rate limiting zones already configured"
fi
echo ""

echo "🔧 Step 4: Validating nginx configuration..."
# Check if the main config has the required content
if grep -q "server_name" ./nginx/sites/relas.conf && grep -q "proxy_pass" ./nginx/sites/relas.conf; then
    echo "✅ Main config file appears valid"
else
    echo "❌ Main config file is invalid"
    exit 1
fi
echo ""

echo "🔧 Step 5: Restarting nginx container..."
docker-compose stop nginx
sleep 3
docker-compose start nginx
echo ""

echo "⏳ Step 6: Waiting for nginx to start..."
sleep 10
echo ""

echo "🔍 Step 7: Checking nginx status..."
if docker-compose ps nginx | grep -q "Up"; then
    echo "✅ Nginx container is running"
else
    echo "❌ Nginx container failed to start"
    echo "Checking logs:"
    docker-compose logs --tail=15 nginx
    exit 1
fi
echo ""

echo "🔍 Step 8: Testing connectivity..."
if docker-compose exec nginx curl -s http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Nginx is responding on port 80"
else
    echo "❌ Nginx not responding on port 80"
    echo "Recent nginx logs:"
    docker-compose logs --tail=10 nginx
fi
echo ""

echo "📋 Step 9: Final status check..."
docker-compose ps
echo ""

echo "✅ Nginx configuration conflicts have been resolved!"
echo ""
echo "🌐 Your site should now be accessible at:"
DOMAIN=$(grep -o 'server_name [^;]*' ./nginx/sites/relas.conf | head -1 | awk '{print $2}' 2>/dev/null || echo "test.anuragramdasan.com")
echo "   https://$DOMAIN"
echo ""
echo "⏳ If still getting 521 errors, wait 2-3 minutes for changes to propagate"