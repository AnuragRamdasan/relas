#!/bin/bash

# Diagnostic script for deployment issues
echo "🔍 Diagnosing deployment issues..."
echo "=================================="
echo ""

echo "📊 Container Status:"
docker-compose ps
echo ""

echo "🔍 Nginx container logs (last 20 lines):"
docker-compose logs --tail=20 nginx
echo ""

echo "📋 App container logs (last 10 lines):"
docker-compose logs --tail=10 app
echo ""

echo "🌐 Network connectivity:"
echo "Port 3000 (app): $(netstat -tlnp | grep :3000 || echo 'Not listening')"
echo "Port 80 (nginx): $(netstat -tlnp | grep :80 || echo 'Not listening')"
echo "Port 443 (nginx): $(netstat -tlnp | grep :443 || echo 'Not listening')"
echo ""

echo "📁 Nginx configuration files:"
echo "Main config exists: $([ -f ./nginx/nginx.conf ] && echo 'Yes' || echo 'No')"
echo "Site config exists: $([ -f ./nginx/sites/relas.conf ] && echo 'Yes' || echo 'No')"
echo ""

echo "🔐 SSL certificate status:"
if [ -d "/etc/letsencrypt/live" ]; then
    echo "Letsencrypt directory exists"
    ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "Cannot access letsencrypt directory"
else
    echo "No SSL certificates found"
fi
echo ""

echo "🌍 Domain configuration check:"
grep "server_name" ./nginx/sites/relas.conf 2>/dev/null || echo "Cannot read nginx config"
echo ""

echo "💡 Quick fixes:"
echo "1. Check nginx logs: docker-compose logs nginx"
echo "2. Restart nginx: docker-compose restart nginx"
echo "3. Access app directly: http://[SERVER_IP]:3000"
echo "4. Check domain DNS: nslookup your-domain.com"