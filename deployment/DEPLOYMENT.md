# Relas - Relationship Assistant Deployment Guide

## Docker Deployment Issues Fixed

This guide addresses the Prisma permission and environment variable issues encountered during Docker deployment.

## Prerequisites

1. **Environment Variables**: Copy `.env.example` to `.env` and fill in all required values
2. **Docker & Docker Compose**: Ensure both are installed on your system
3. **Domain Setup**: If deploying to production, ensure your domain points to the server

## Environment Variables Setup

### Required Variables

All variables from `.env.example` must be configured:

```bash
# Database
DATABASE_URL="postgresql://postgres:SECURE_PASSWORD@postgres:5432/relas"

# NextAuth.js  
NEXTAUTH_URL="https://yourdomain.com"  # or http://localhost:3000 for local
NEXTAUTH_SECRET="your-secure-random-string-32-chars-min"

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY="sk_test_or_live_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_or_live_your-publishable-key"
NEXT_PUBLIC_SUBSCRIPTION_PRICE_ID="price_your-price-id"

# Twilio (get from Twilio Console)
TWILIO_ACCOUNT_SID="AC..." # Must start with AC
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# OpenAI (get from OpenAI Platform)
OPENAI_API_KEY="sk-your-openai-api-key"

# PostgreSQL (for Docker)
POSTGRES_DB="relas"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="SECURE_PASSWORD"
```

## Docker Deployment

### Local Development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd relas

# 2. Setup environment
cp .env.example .env
# Edit .env with your actual values

# 3. Build and start services
docker-compose up --build

# 4. Run database migrations (in another terminal)
docker-compose exec app npx prisma migrate deploy
```

### Production Deployment

```bash
# 1. Setup environment with production values
cp .env.example .env
# Configure all production API keys and URLs

# 2. Build and start in production mode
docker-compose -f docker-compose.yml up --build -d

# 3. Setup SSL certificates (if using nginx)
./deployment/scripts/ssl-setup.sh yourdomain.com

# 4. Run database migrations
docker-compose exec app npx prisma migrate deploy
```

## Fixes Applied

### 1. Docker Permission Issues
- Fixed Prisma client file ownership in Dockerfile
- Ensured all copied files have correct `nextjs:nodejs` ownership

### 2. Environment Variables
- Updated docker-compose.yml to match current .env structure
- Removed obsolete `version` field from docker-compose.yml
- Fixed Stripe environment variable names

### 3. Build Process
- Prisma client generation happens during Docker build
- Proper TypeScript compilation with all type fixes

## Troubleshooting

### Permission Errors
If you see `EACCES: permission denied` errors:

```bash
# Remove containers and rebuild
docker-compose down
docker system prune -f
docker-compose up --build
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Connect to database manually
docker-compose exec postgres psql -U postgres -d relas
```

### Missing Environment Variables
```bash
# Check container environment
docker-compose exec app env | grep -E "(STRIPE|TWILIO|OPENAI|GOOGLE)"
```

### Prisma Issues
```bash
# Regenerate Prisma client in container
docker-compose exec app npx prisma generate

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Check database status
docker-compose exec app npx prisma migrate status
```

## Monitoring

### Application Logs
```bash
docker-compose logs -f app
```

### Database Logs
```bash
docker-compose logs -f postgres
```

### Nginx Logs (if using reverse proxy)
```bash
docker-compose logs -f nginx
```

## Security Notes

1. **Environment Variables**: Never commit real API keys to version control
2. **Database**: Use strong passwords in production
3. **HTTPS**: Always use SSL certificates in production
4. **Firewall**: Configure appropriate firewall rules
5. **Updates**: Keep Docker images and dependencies updated

## Production Checklist

- [ ] All environment variables configured with production values
- [ ] SSL certificates installed and configured
- [ ] Database backups configured
- [ ] Monitoring and logging setup
- [ ] Firewall rules configured
- [ ] Domain DNS pointing to server
- [ ] Webhook endpoints configured in Stripe/Twilio
- [ ] Google OAuth redirect URLs updated
- [ ] Test all integrations (SMS, payments, AI responses)