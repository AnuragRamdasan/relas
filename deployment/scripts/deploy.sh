#!/bin/bash

# Deployment script for Relationship Assistant
# Run this script from the application directory as the relas user

set -e

echo "🚀 Deploying Relationship Assistant..."

# Check if running as relas user
if [ "$USER" != "relas" ]; then
    echo "❌ This script must be run as the 'relas' user"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.production.example"
    exit 1
fi

# Validate critical environment variables
echo "🔍 Validating environment variables..."

# Function to check if environment variable exists in .env
check_env_var() {
    local var_name="$1"
    local var_description="$2"
    local is_required="$3"
    
    if ! grep -q "^${var_name}=" .env; then
        if [ "$is_required" = "true" ]; then
            echo "❌ Missing required environment variable: $var_name"
            echo "   Description: $var_description"
            echo "   Please add this to your .env file"
            return 1
        else
            echo "⚠️  Optional environment variable missing: $var_name"
            echo "   Description: $var_description"
            return 0
        fi
    else
        # Check if the value is not a placeholder
        local value=$(grep "^${var_name}=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [[ "$value" == *"your-"* ]] || [[ "$value" == *"GENERATE"* ]] || [[ "$value" == *"example"* ]] || [ -z "$value" ]; then
            if [ "$is_required" = "true" ]; then
                echo "❌ Environment variable $var_name has placeholder value: $value"
                echo "   Description: $var_description"
                echo "   Please update with actual value"
                return 1
            else
                echo "⚠️  Environment variable $var_name has placeholder value: $value"
                return 0
            fi
        else
            echo "✅ $var_name is configured"
            return 0
        fi
    fi
}

# Track if any required variables are missing
ENV_ERRORS=0

# Database Configuration
check_env_var "DATABASE_URL" "PostgreSQL connection string" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "POSTGRES_DB" "Database name" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "POSTGRES_USER" "Database user" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "POSTGRES_PASSWORD" "Database password" true || ENV_ERRORS=$((ENV_ERRORS + 1))

# NextAuth Configuration
check_env_var "NEXTAUTH_URL" "Application URL for authentication" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "NEXTAUTH_SECRET" "Secret key for NextAuth sessions" true || ENV_ERRORS=$((ENV_ERRORS + 1))

# Stripe Configuration
check_env_var "STRIPE_SECRET_KEY" "Stripe secret key for payments" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "STRIPE_WEBHOOK_SECRET" "Stripe webhook secret" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Stripe publishable key (client-side)" true || ENV_ERRORS=$((ENV_ERRORS + 1))
check_env_var "NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID" "Stripe price ID for subscriptions" true || ENV_ERRORS=$((ENV_ERRORS + 1))

# Application Configuration
check_env_var "APP_URL" "Application base URL" true || ENV_ERRORS=$((ENV_ERRORS + 1))

# Optional but recommended variables
check_env_var "OPENAI_API_KEY" "OpenAI API key for AI features" false
check_env_var "TWILIO_ACCOUNT_SID" "Twilio account SID for SMS/WhatsApp" false
check_env_var "TWILIO_AUTH_TOKEN" "Twilio auth token" false
check_env_var "GOOGLE_CLIENT_ID" "Google OAuth client ID" false

# Exit if any required variables are missing
if [ $ENV_ERRORS -gt 0 ]; then
    echo ""
    echo "❌ $ENV_ERRORS required environment variable(s) are missing or have placeholder values"
    echo ""
    echo "🔧 To fix this:"
    echo "1. Copy the example file: cp .env.production.example .env"
    echo "2. Edit the .env file with your actual values: nano .env"
    echo "3. For Stripe configuration, see: docs/STRIPE-COUPONS.md"
    echo "4. For complete setup guide, see: docs/CLOUDFLARE-HETZNER-SETUP.md"
    echo ""
    exit 1
fi

echo "✅ All required environment variables are configured"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running or accessible"
    exit 1
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Clean up nginx configuration to prevent conflicts
echo "🧹 Cleaning nginx configuration..."
# Remove any backup, temporary, or conflicting config files
find ./nginx/sites/ -name "*.backup*" -type f -delete 2>/dev/null || true
find ./nginx/sites/ -name "*~" -type f -delete 2>/dev/null || true
find ./nginx/sites/ -name "*.tmp" -type f -delete 2>/dev/null || true

# Ensure only the main config file exists
if [ ! -f "./nginx/sites/relas.conf" ]; then
    echo "⚠️  Main nginx config file not found. Using Cloudflare template..."
    if [ -f "./nginx/sites/relas-cloudflare.conf" ]; then
        cp ./nginx/sites/relas-cloudflare.conf ./nginx/sites/relas.conf
        echo "✅ Created main config from Cloudflare template"
    else
        echo "❌ No nginx config template found"
        exit 1
    fi
fi

# Remove any other .conf files to prevent conflicts
find ./nginx/sites/ -name "*.conf" -not -name "relas.conf" -type f -delete 2>/dev/null || true

# Basic validation of nginx config file
echo "✅ Validating nginx configuration..."
if grep -q "server_name" "./nginx/sites/relas.conf" && grep -q "proxy_pass" "./nginx/sites/relas.conf"; then
    echo "✅ Nginx configuration appears valid"
    
    # Check if using Cloudflare config
    if grep -q "CF-Connecting-IP" "./nginx/sites/relas.conf"; then
        echo "🌐 Using Cloudflare-optimized configuration"
    else
        echo "🔧 Using standard configuration"
    fi
else
    echo "❌ Nginx configuration is missing required directives"
    exit 1
fi

# Build and start services
echo "🏗️ Building application..."
docker-compose build --no-cache

echo "🔧 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy

# Generate Prisma client (if needed)
echo "🔧 Generating Prisma client..."
docker-compose exec -T app npx prisma generate

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    
    # Special check for nginx - ensure it's actually running and not restarting
    echo "🔍 Checking nginx specifically..."
    sleep 5  # Give nginx time to start properly
    
    if docker-compose ps nginx | grep -q "Up"; then
        echo "✅ Nginx container is running!"
        
        # Test if nginx is actually responding
        echo "🔍 Testing nginx connectivity..."
        if docker-compose exec -T app curl -s http://nginx:80 > /dev/null 2>&1; then
            echo "✅ Nginx is responding to requests!"
        else
            echo "⚠️  Nginx is running but may not be responding properly"
            echo "Recent nginx logs:"
            docker-compose logs --tail=10 nginx
        fi
    else
        echo "❌ Nginx container has issues. Showing logs:"
        docker-compose logs --tail=20 nginx
        echo ""
        echo "🔧 Common issues and fixes:"
        echo "   1. Configuration conflicts: Remove duplicate config files"
        echo "   2. Syntax errors: Check nginx config syntax"
        echo "   3. IP blocking: Ensure config allows necessary traffic"
        echo "   4. Port conflicts: Check if port 80 is already in use"
        echo ""
        echo "🔧 Quick troubleshooting:"
        echo "   docker-compose exec nginx nginx -t    # Test config"
        echo "   docker-compose restart nginx          # Restart nginx"
        echo "   docker-compose logs nginx             # View full logs"
        exit 1
    fi
else
    echo "❌ Some services failed to start"
    docker-compose logs --tail=50
    exit 1
fi

# Show running containers
echo ""
echo "📊 Running containers:"
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""

# Check if using Cloudflare config
if grep -q "CF-Connecting-IP" "./nginx/sites/relas.conf"; then
    echo "🌐 Cloudflare configuration detected!"
    echo "🔗 Your application should be available at:"
    DOMAIN=$(grep -o 'server_name [^;]*' ./nginx/sites/relas.conf | head -1 | awk '{print $2}' || echo "your-domain.com")
    echo "   HTTPS: https://$DOMAIN"
    echo ""
    echo "⚠️  Important: Ensure Cloudflare is properly configured:"
    echo "   1. DNS records are proxied (orange cloud)"
    echo "   2. SSL/TLS mode is set to 'Flexible'"
    echo "   3. 'Always Use HTTPS' is enabled"
else
    echo "🔗 Your application should be available at:"
    echo "   HTTP:  http://$(curl -s ifconfig.me)"
    echo "   HTTPS: https://your-domain.com (after SSL setup)"
fi
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart app:   docker-compose restart app"
echo "   Stop all:      docker-compose down"
echo "   Update app:    ./deployment/scripts/deploy.sh"