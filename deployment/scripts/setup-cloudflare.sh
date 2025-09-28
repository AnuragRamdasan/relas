#!/bin/bash

# Setup script for Cloudflare + Hetzner deployment
set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <your-domain.com>"
    echo "   Example: $0 myapp.example.com"
    exit 1
fi

DOMAIN=$1
echo "🌐 Setting up Cloudflare configuration for: $DOMAIN"
echo ""

# Check if we're in the right directory
if [ ! -f "./nginx/sites/relas-cloudflare.conf" ]; then
    echo "❌ Cloudflare nginx config not found. Run this from the app root directory."
    exit 1
fi

# Backup current config
echo "📁 Creating backup of current nginx config..."
if [ -f "./nginx/sites/relas.conf" ]; then
    cp ./nginx/sites/relas.conf ./nginx/sites/relas.conf.backup.$(date +%Y%m%d-%H%M%S)
fi

# Use Cloudflare config
echo "🔄 Switching to Cloudflare-optimized nginx configuration..."
cp ./nginx/sites/relas-cloudflare.conf ./nginx/sites/relas.conf

# Update domain in config
echo "🔄 Updating domain in nginx config..."
sed -i "s/test\.anuragramdasan\.com/$DOMAIN/g" ./nginx/sites/relas.conf
sed -i "s/www\.test\.anuragramdasan\.com/www.$DOMAIN/g" ./nginx/sites/relas.conf

# Update .env file if it exists
if [ -f ".env" ]; then
    echo "🔄 Updating NEXTAUTH_URL in .env file..."
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|g" .env
    
    # Add if not present
    if ! grep -q "NEXTAUTH_URL" .env; then
        echo "NEXTAUTH_URL=https://$DOMAIN" >> .env
    fi
fi

# Clean up old backup files
echo "🧹 Cleaning up old backup files..."
find ./nginx/sites/ -name "*.backup.*" -type f -mtime +7 -delete 2>/dev/null || true

echo ""
echo "✅ Cloudflare configuration setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Follow the Cloudflare setup guide: docs/CLOUDFLARE-HETZNER-SETUP.md"
echo "2. Configure DNS in Cloudflare:"
echo "   - A record: @ → YOUR_SERVER_IP (proxied)"
echo "   - A record: www → YOUR_SERVER_IP (proxied)"
echo "3. Set SSL/TLS mode to 'Flexible' in Cloudflare"
echo "4. Run deployment: ./deployment/scripts/deploy.sh"
echo ""
echo "🌐 After deployment, your app will be available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📋 Important: Configure webhook URLs:"
echo "   Twilio: https://$DOMAIN/api/twilio/webhook"
echo "   Stripe: https://$DOMAIN/api/stripe/webhook"