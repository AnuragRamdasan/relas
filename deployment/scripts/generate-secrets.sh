#!/bin/bash

# Generate secure secrets for the Relationship Assistant application

echo "🔐 Generating secure secrets for Relationship Assistant..."
echo ""

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "🗄️ Database Password: $DB_PASSWORD"

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -hex 32)
echo "🔑 NextAuth Secret: $NEXTAUTH_SECRET"

echo ""
echo "📝 Add these to your .env file:"
echo ""
echo "POSTGRES_PASSWORD=\"$DB_PASSWORD\""
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\""
echo ""

# If .env file exists, offer to update it
if [ -f ".env" ]; then
    echo "❓ Would you like to automatically update your .env file? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        # Update .env file
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=\"$DB_PASSWORD\"/" .env
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env
        echo "✅ Updated .env file with secure secrets"
    fi
fi

echo ""
echo "⚠️  Important: Store these secrets securely and never commit them to version control!"