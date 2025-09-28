#!/bin/bash

echo "🔧 Fixing nginx rate limiting conflict..."

# Stop nginx
echo "Stopping nginx..."
docker-compose stop nginx

# Use the fixed config
echo "Applying fixed configuration..."
cp nginx/sites/relas-fixed.conf nginx/sites/relas.conf

# Start nginx
echo "Starting nginx..."
docker-compose start nginx

# Wait for startup
echo "Waiting for nginx to start..."
sleep 5

# Check status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🔍 Testing connectivity..."

# Test local connection
echo "Testing localhost:80..."
curl -I http://localhost:80 2>/dev/null && echo "✅ Local HTTP works!" || echo "❌ Local HTTP failed"

# Test domain
echo "Testing domain..."
curl -I http://test.anuragramdasan.com 2>/dev/null && echo "✅ Domain HTTP works!" || echo "❌ Domain HTTP failed"

echo ""
echo "📋 If still failing, check nginx logs:"
echo "   docker-compose logs nginx"