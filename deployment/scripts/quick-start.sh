#!/bin/bash

# Quick Start Script for Hetzner VPS Deployment
# This script provides an interactive setup for the Relationship Assistant

set -e

echo "🎯 Relationship Assistant - Hetzner VPS Quick Start"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "📋 Setting up VPS as root user..."
    
    # Run VPS setup
    echo "🚀 Running VPS setup script..."
    curl -fsSL https://raw.githubusercontent.com/your-repo/main/deployment/scripts/setup-vps.sh | bash
    
    echo ""
    echo "✅ VPS setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Switch to the relas user: sudo su - relas"
    echo "2. Run this script again: curl -fsSL https://your-domain.com/quick-start.sh | bash"
    echo ""
    exit 0
fi

# Check if running as relas user
if [ "$USER" != "relas" ]; then
    echo "❌ Please run this script as the 'relas' user"
    echo "   sudo su - relas"
    exit 1
fi

echo "👤 Running as relas user - proceeding with application setup..."
echo ""

# Get domain name
read -p "🌐 Enter your domain name (e.g., relationshipassistant.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

# Clone repository
echo "📥 Cloning repository..."
if [ ! -d "app" ]; then
    git clone https://github.com/your-username/relationship-assistant.git app
fi
cd app

# Create environment file
echo "⚙️ Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.production.example .env
    
    # Generate secure secret
    SECRET=$(openssl rand -hex 32)
    sed -i "s/your-very-secure-secret-key-at-least-32-characters/$SECRET/g" .env
    sed -i "s/your-domain.com/$DOMAIN/g" .env
    
    echo ""
    echo "📝 Environment file created at .env"
    echo "⚠️  IMPORTANT: You need to configure the following:"
    echo ""
    echo "🔑 API Keys needed:"
    echo "   - Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)"
    echo "   - Stripe (STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)"
    echo "   - Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
    echo "   - OpenAI (OPENAI_API_KEY)"
    echo ""
    echo "💾 Edit the .env file: nano .env"
    echo ""
    read -p "Press Enter when you've configured all API keys..."
fi

# Deploy application
echo "🚀 Deploying application..."
./deployment/scripts/deploy.sh

echo ""
echo "🔐 Setting up SSL certificate..."
echo "⚠️  Make sure your domain DNS is pointing to this server!"
read -p "Press Enter when DNS is configured..."

# Setup SSL (requires root)
sudo ./deployment/scripts/ssl-setup.sh $DOMAIN

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Your application is available at:"
echo "   https://$DOMAIN"
echo ""
echo "📋 Important next steps:"
echo ""
echo "1. 🔗 Configure external service webhooks:"
echo "   - Stripe webhook: https://$DOMAIN/api/stripe/webhook"
echo "   - Twilio webhook: https://$DOMAIN/api/twilio/webhook"
echo ""
echo "2. 🔑 Configure OAuth redirect URIs:"
echo "   - Google: https://$DOMAIN/api/auth/callback/google"
echo ""
echo "3. 📱 Test your application:"
echo "   - Visit https://$DOMAIN"
echo "   - Try signing in with Google"
echo "   - Send a test SMS to your Twilio number"
echo ""
echo "📊 Monitoring commands:"
echo "   docker-compose logs -f app    # View application logs"
echo "   docker-compose ps             # Check service status"
echo "   ./deployment/scripts/backup.sh # Create backup"
echo ""
echo "🆘 Support:"
echo "   - Documentation: README.md and DEPLOYMENT.md"
echo "   - Issues: https://github.com/your-username/relationship-assistant/issues"
echo ""