#!/bin/bash

# Environment setup script for Relationship Assistant
# This script helps you configure all required environment variables

set -e

echo "🔧 Environment Setup for Relationship Assistant"
echo "=============================================="
echo ""

# Check if .env exists, if not create from example
if [ ! -f ".env" ]; then
    if [ -f ".env.production.example" ]; then
        echo "📋 Creating .env file from template..."
        cp .env.production.example .env
        echo "✅ Created .env file from .env.production.example"
    else
        echo "❌ No .env.production.example file found"
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔍 Checking environment variables..."
echo ""

# Function to update or add environment variable
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local file=".env"
    
    if grep -q "^${var_name}=" "$file"; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
        else
            # Linux
            sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
        fi
        echo "✅ Updated $var_name"
    else
        # Add new variable
        echo "${var_name}=${var_value}" >> "$file"
        echo "✅ Added $var_name"
    fi
}

# Function to check if variable needs updating
needs_update() {
    local var_name="$1"
    local current_value=$(grep "^${var_name}=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [[ -z "$current_value" ]] || [[ "$current_value" == *"your-"* ]] || [[ "$current_value" == *"GENERATE"* ]] || [[ "$current_value" == *"example"* ]]; then
        return 0  # needs update
    else
        return 1  # already configured
    fi
}

# Get domain name
echo "🌐 Domain Configuration"
echo "======================"
if needs_update "NEXTAUTH_URL" || needs_update "APP_URL"; then
    read -p "Enter your domain (e.g., test.anuragramdasan.com): " DOMAIN
    if [ -n "$DOMAIN" ]; then
        update_env_var "NEXTAUTH_URL" "https://$DOMAIN"
        update_env_var "APP_URL" "https://$DOMAIN"
    fi
else
    echo "✅ Domain already configured"
fi

echo ""
echo "🔐 Database Configuration"
echo "========================"
if needs_update "POSTGRES_PASSWORD"; then
    echo "Generating secure database password..."
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    update_env_var "POSTGRES_PASSWORD" "$DB_PASSWORD"
else
    echo "✅ Database password already configured"
fi

if needs_update "NEXTAUTH_SECRET"; then
    echo "Generating NextAuth secret..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    update_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
else
    echo "✅ NextAuth secret already configured"
fi

echo ""
echo "💳 Stripe Configuration"
echo "======================"
echo "To configure Stripe, you need to:"
echo "1. Go to https://dashboard.stripe.com/"
echo "2. Get your API keys from the Developers section"
echo "3. Create a product and get the price ID"
echo ""

if needs_update "STRIPE_SECRET_KEY"; then
    read -p "Enter your Stripe Secret Key (sk_...): " STRIPE_SECRET
    if [ -n "$STRIPE_SECRET" ]; then
        update_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET"
    fi
else
    echo "✅ Stripe secret key already configured"
fi

if needs_update "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"; then
    read -p "Enter your Stripe Publishable Key (pk_...): " STRIPE_PUBLISHABLE
    if [ -n "$STRIPE_PUBLISHABLE" ]; then
        update_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE"
    fi
else
    echo "✅ Stripe publishable key already configured"
fi

if needs_update "NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID"; then
    read -p "Enter your Stripe Price ID (price_...): " STRIPE_PRICE
    if [ -n "$STRIPE_PRICE" ]; then
        update_env_var "NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID" "$STRIPE_PRICE"
    fi
else
    echo "✅ Stripe price ID already configured"
fi

if needs_update "STRIPE_WEBHOOK_SECRET"; then
    read -p "Enter your Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK
    if [ -n "$STRIPE_WEBHOOK" ]; then
        update_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK"
    fi
else
    echo "✅ Stripe webhook secret already configured"
fi

echo ""
echo "🤖 OpenAI Configuration (Optional)"
echo "================================="
if needs_update "OPENAI_API_KEY"; then
    read -p "Enter your OpenAI API Key (sk-proj-... or skip): " OPENAI_KEY
    if [ -n "$OPENAI_KEY" ]; then
        update_env_var "OPENAI_API_KEY" "$OPENAI_KEY"
    fi
else
    echo "✅ OpenAI API key already configured"
fi

echo ""
echo "📱 Twilio Configuration (Optional)"
echo "================================="
if needs_update "TWILIO_ACCOUNT_SID"; then
    read -p "Enter your Twilio Account SID (or skip): " TWILIO_SID
    if [ -n "$TWILIO_SID" ]; then
        update_env_var "TWILIO_ACCOUNT_SID" "$TWILIO_SID"
    fi
else
    echo "✅ Twilio Account SID already configured"
fi

if needs_update "TWILIO_AUTH_TOKEN"; then
    read -p "Enter your Twilio Auth Token (or skip): " TWILIO_TOKEN
    if [ -n "$TWILIO_TOKEN" ]; then
        update_env_var "TWILIO_AUTH_TOKEN" "$TWILIO_TOKEN"
    fi
else
    echo "✅ Twilio Auth Token already configured"
fi

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review your .env file: cat .env"
echo "2. Run the deployment: ./deployment/scripts/deploy.sh"
echo "3. For detailed setup guide: docs/CLOUDFLARE-HETZNER-SETUP.md"
echo ""

# Final validation
echo "🔍 Final validation..."
missing_vars=()

required_vars=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET" "STRIPE_SECRET_KEY" "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID" "APP_URL")

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || [[ $(grep "^${var}=" .env | cut -d'=' -f2-) == *"your-"* ]]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo "✅ All required variables are configured!"
else
    echo "⚠️  Still missing or have placeholder values:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "💡 You can run this script again or edit .env manually"
fi