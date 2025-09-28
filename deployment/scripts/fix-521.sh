#!/bin/bash

# Quick fix script for Cloudflare 521 errors
set -e

echo "🚑 Quick Fix for Cloudflare 521 Error"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Run this script from the application root directory"
    exit 1
fi

echo "🔍 Step 1: Checking current status..."
echo "Container status:"
docker-compose ps
echo ""

echo "🔧 Step 2: Ensuring Cloudflare configuration..."
# Check if using Cloudflare config
if ! grep -q 'CF-Connecting-IP' ./nginx/sites/relas.conf 2>/dev/null; then
    echo "⚠️  Not using Cloudflare config. Switching..."
    if [ -f "./nginx/sites/relas-cloudflare.conf" ]; then
        cp ./nginx/sites/relas-cloudflare.conf ./nginx/sites/relas.conf
        echo "✅ Switched to Cloudflare configuration"
    else
        echo "❌ Cloudflare config not found. Please run: git pull"
        exit 1
    fi
else
    echo "✅ Already using Cloudflare configuration"
fi
echo ""

echo "🔧 Step 3: Restarting containers..."
docker-compose down
sleep 5
docker-compose up -d
echo ""

echo "⏳ Step 4: Waiting for services to start..."
sleep 30
echo ""

echo "🔍 Step 5: Checking service status..."
echo "Container status:"
docker-compose ps
echo ""

echo "🔍 Step 6: Testing connectivity..."
# Test if nginx is responding
if docker-compose exec nginx curl -s http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Nginx is responding on port 80"
else
    echo "❌ Nginx still not responding"
    echo "Checking nginx logs:"
    docker-compose logs --tail=10 nginx
fi
echo ""

# Test if app is responding
if docker-compose exec app curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ App is responding on port 3000"
else
    echo "❌ App not responding on port 3000"
    echo "Checking app logs:"
    docker-compose logs --tail=10 app
fi
echo ""

echo "🔍 Step 7: Checking port 80 binding..."
if docker-compose ps nginx | grep -q "Up.*:80->"; then
    echo "✅ Nginx container has port 80 mapped"
else
    echo "❌ Nginx container doesn't have port 80 mapped"
    echo "Checking docker-compose.yml configuration..."
fi
echo ""

echo "📋 Final Status:"
echo "==============="
if docker-compose ps | grep -q "nginx.*Up" && docker-compose ps | grep -q "app.*Up"; then
    echo "✅ All containers are running"
    echo ""
    echo "🌐 Your site should be accessible at:"
    DOMAIN=$(grep -o 'server_name [^;]*' ./nginx/sites/relas.conf | head -1 | awk '{print $2}' 2>/dev/null || echo "your-domain.com")
    echo "   https://$DOMAIN"
    echo ""
    echo "⏳ If still getting 521 error, wait 2-3 minutes for DNS propagation"
    echo "   or check Cloudflare dashboard for any service issues"
else
    echo "❌ Some containers are not running properly"
    echo ""
    echo "🔧 Try these additional steps:"
    echo "1. Check logs: docker-compose logs"
    echo "2. Rebuild: docker-compose up -d --build"
    echo "3. Check firewall: sudo ufw status"
    echo "4. Run full troubleshooting: ./deployment/scripts/troubleshoot-521.sh"
fi