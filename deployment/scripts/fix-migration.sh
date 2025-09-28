#!/bin/bash

# Fix migration conflict script
# Resolves P3018 error when migration state doesn't match database

set -e

echo "🔧 Migration Conflict Resolution"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Run this script from the application root directory"
    exit 1
fi

# Check if containers are running
if ! docker-compose ps app | grep -q "Up"; then
    echo "❌ Application container is not running"
    echo "💡 Start it first: docker-compose up -d"
    exit 1
fi

echo "🔍 Checking migration status..."
MIGRATION_STATUS=$(docker-compose exec -T app npx prisma migrate status 2>&1 || echo "error")

echo "Current status:"
echo "$MIGRATION_STATUS"
echo ""

if echo "$MIGRATION_STATUS" | grep -q "P3018"; then
    echo "🎯 Detected P3018 migration conflict!"
    echo ""
    
    # Extract the migration name from the error
    MIGRATION_NAME=$(echo "$MIGRATION_STATUS" | grep -o "Migration name: [^[:space:]]*" | cut -d' ' -f3)
    
    if [ -n "$MIGRATION_NAME" ]; then
        echo "📝 Found conflicting migration: $MIGRATION_NAME"
        echo ""
        echo "🤔 This happens when:"
        echo "   - Database has tables but migration history is missing"
        echo "   - Migration was partially applied"
        echo "   - Database was created outside of Prisma migrations"
        echo ""
        echo "💡 Solutions:"
        echo "1. Mark migration as already applied (safe)"
        echo "2. Roll back and retry (might lose data)"
        echo "3. Reset migration history (DANGEROUS)"
        echo ""
        read -p "Choose option (1-3): " choice
        
        case $choice in
            1)
                echo "✅ Marking migration as applied..."
                docker-compose exec -T app npx prisma migrate resolve --applied "$MIGRATION_NAME"
                echo "🔄 Running migrate deploy..."
                docker-compose exec -T app npx prisma migrate deploy
                echo "✅ Migration conflict resolved!"
                ;;
            2)
                echo "🔄 Rolling back migration..."
                docker-compose exec -T app npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"
                echo "🔄 Running migrate deploy..."
                docker-compose exec -T app npx prisma migrate deploy
                echo "✅ Migration rolled back and reapplied!"
                ;;
            3)
                echo "⚠️  WARNING: This will reset migration history!"
                echo "   Your data will be preserved, but migration tracking will be lost."
                read -p "Are you sure? Type 'RESET' to confirm: " confirm
                if [ "$confirm" = "RESET" ]; then
                    echo "🗑️  Resetting migration history..."
                    docker-compose exec -T postgres psql -U relas_user -d relas_production -c "DROP TABLE IF EXISTS \"_prisma_migrations\";"
                    echo "🔄 Running migrate deploy..."
                    docker-compose exec -T app npx prisma migrate deploy
                    echo "✅ Migration history reset and reapplied!"
                else
                    echo "❌ Reset cancelled"
                    exit 1
                fi
                ;;
            *)
                echo "❌ Invalid option"
                exit 1
                ;;
        esac
    else
        echo "❌ Could not extract migration name from error"
        echo "💡 Try running manually: docker-compose exec app npx prisma migrate status"
        exit 1
    fi
    
elif echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo "✅ No migration issues found - database is up to date!"
    
elif echo "$MIGRATION_STATUS" | grep -q "pending"; then
    echo "📝 Found pending migrations, applying them..."
    docker-compose exec -T app npx prisma migrate deploy
    echo "✅ Pending migrations applied!"
    
else
    echo "🔄 Running standard migration deploy..."
    docker-compose exec -T app npx prisma migrate deploy
    echo "✅ Migrations completed!"
fi

echo ""
echo "🔍 Final migration status:"
docker-compose exec -T app npx prisma migrate status
echo ""
echo "✅ Migration fix complete!"
echo ""
echo "💡 You can now run your deployment:"
echo "   ./deployment/scripts/deploy.sh"