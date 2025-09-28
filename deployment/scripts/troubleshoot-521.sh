#!/bin/bash

# Troubleshooting script for Cloudflare 521 errors
echo "🔍 Troubleshooting Cloudflare 521 Error"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Run this script from the application root directory"
    exit 1
fi

echo "1. 📊 Container Status:"
echo "----------------------"
docker-compose ps
echo ""

echo "2. 🔍 Port 80 Status:"
echo "--------------------"
if command -v netstat >/dev/null 2>&1; then
    netstat -tlnp | grep :80 || echo "❌ Nothing listening on port 80"
else
    ss -tlnp | grep :80 || echo "❌ Nothing listening on port 80"
fi
echo ""

echo "3. 🔍 Nginx Container Logs (last 20 lines):"
echo "-------------------------------------------"
docker-compose logs --tail=20 nginx
echo ""

echo "4. 🔍 App Container Logs (last 10 lines):"
echo "-----------------------------------------"
docker-compose logs --tail=10 app
echo ""

echo "5. 🔍 Nginx Configuration Check:"
echo "--------------------------------"
if docker-compose exec nginx nginx -t 2>/dev/null; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    docker-compose exec nginx nginx -t
fi
echo ""

echo "6. 🌐 Network Connectivity:"
echo "---------------------------"
# Test if app container is reachable
if docker-compose exec nginx curl -s http://app:3000/health > /dev/null 2>&1; then
    echo "✅ App container is reachable from nginx"
else
    echo "❌ App container is not reachable from nginx"
    echo "Testing direct app connectivity..."
    docker-compose exec app curl -s http://localhost:3000/health > /dev/null 2>&1 && echo "✅ App responds on localhost:3000" || echo "❌ App not responding on localhost:3000"
fi
echo ""

echo "7. 🔍 Current nginx config file:"
echo "--------------------------------"
if [ -f "./nginx/sites/relas.conf" ]; then
    echo "✅ nginx config file exists"
    echo "Domain configured for: $(grep 'server_name' ./nginx/sites/relas.conf | head -1)"
    echo "Config type: $(grep -q 'CF-Connecting-IP' ./nginx/sites/relas.conf && echo 'Cloudflare' || echo 'Standard')"
else
    echo "❌ nginx config file missing!"
fi
echo ""

echo "8. 📋 Quick Fixes to Try:"
echo "========================="
echo ""

echo "🔧 Fix 1: Restart nginx container"
echo "   docker-compose restart nginx"
echo ""

echo "🔧 Fix 2: Restart all containers"
echo "   docker-compose restart"
echo ""

echo "🔧 Fix 3: Check if using wrong config"
if ! grep -q 'CF-Connecting-IP' ./nginx/sites/relas.conf 2>/dev/null; then
    echo "   You might need to switch to Cloudflare config:"
    echo "   ./deployment/scripts/setup-cloudflare.sh your-domain.com"
fi
echo ""

echo "🔧 Fix 4: Rebuild and restart everything"
echo "   docker-compose down"
echo "   docker-compose up -d --build"
echo ""

echo "🔧 Fix 5: Check firewall settings"
echo "   sudo ufw status"
echo "   # Ensure port 80 is allowed"
echo ""

echo "📞 Need more help? Check these logs:"
echo "   docker-compose logs nginx"
echo "   docker-compose logs app"
echo "   journalctl -u docker"