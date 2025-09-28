#!/bin/bash

# Dedicated database migration script
# Use this when you specifically want to run database migrations

set -e

echo "🗄️ Database Migration Script"
echo "============================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Run this script from the application root directory"
    exit 1
fi

# Check if containers are running
if ! docker-compose ps app | grep -q "Up"; then
    echo "❌ Application container is not running"
    echo "💡 Start it first: docker-compose up -d app"
    exit 1
fi

# Check current migration status
echo "🔍 Checking current migration status..."
echo ""

MIGRATION_STATUS=$(docker-compose exec -T app npx prisma migrate status 2>/dev/null || echo "error")

if [ "$MIGRATION_STATUS" = "error" ]; then
    echo "❌ Could not check migration status"
    echo "💡 Make sure the database is accessible and Prisma is configured"
    exit 1
fi

echo "$MIGRATION_STATUS"
echo ""

# Ask user what they want to do
echo "🤔 What would you like to do?"
echo "1) Deploy pending migrations (prisma migrate deploy)"
echo "2) Check migration status only"
echo "3) Reset database (DANGEROUS - will delete all data)"
echo "4) Generate Prisma client only"
echo "5) Create new migration (development only)"
echo ""
read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo "🚀 Deploying pending migrations..."
        docker-compose exec -T app npx prisma migrate deploy
        echo "✅ Migrations deployed successfully"
        ;;
    2)
        echo "📊 Migration status already shown above"
        ;;
    3)
        echo "⚠️  WARNING: This will DELETE ALL DATA in your database!"
        read -p "Are you absolutely sure? Type 'DELETE ALL DATA' to confirm: " confirm
        if [ "$confirm" = "DELETE ALL DATA" ]; then
            echo "🗑️  Resetting database..."
            docker-compose exec -T app npx prisma migrate reset --force
            echo "✅ Database reset complete"
        else
            echo "❌ Database reset cancelled"
        fi
        ;;
    4)
        echo "🔧 Generating Prisma client..."
        docker-compose exec -T app npx prisma generate
        echo "✅ Prisma client generated"
        ;;
    5)
        echo "📝 Creating new migration (development only)..."
        read -p "Enter migration name: " migration_name
        if [ -n "$migration_name" ]; then
            docker-compose exec -T app npx prisma migrate dev --name "$migration_name"
            echo "✅ Migration created: $migration_name"
        else
            echo "❌ Migration name is required"
        fi
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🏁 Migration script complete!"
echo ""
echo "💡 Useful commands:"
echo "   Check status: docker-compose exec app npx prisma migrate status"
echo "   View database: npx prisma studio"
echo "   Reset DB: docker-compose exec app npx prisma migrate reset"