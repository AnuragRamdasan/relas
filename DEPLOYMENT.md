# Hetzner VPS Deployment Guide

Complete step-by-step guide to deploy the Relationship Assistant on a Hetzner VPS.

## Prerequisites

- Hetzner VPS (minimum 2GB RAM, 1 CPU, 20GB storage)
- Domain name pointed to your VPS IP
- API keys for all services (Google, Stripe, Twilio, OpenAI)

## Step 1: VPS Initial Setup

### 1.1 Create Hetzner VPS

1. Log into Hetzner Cloud Console
2. Create a new server:
   - **Image**: Ubuntu 22.04 LTS
   - **Type**: CPX21 (2 vCPU, 4GB RAM) or higher
   - **Location**: Choose closest to your users
   - **SSH Key**: Add your public SSH key
   - **Name**: relationship-assistant

### 1.2 Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### 1.3 Run VPS Setup Script

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/relationship-assistant/main/deployment/scripts/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Docker and Docker Compose
- ✅ Configure firewall (UFW)
- ✅ Set up fail2ban for security
- ✅ Create application user and directories
- ✅ Configure systemd service

## Step 2: Application Deployment

### 2.1 Switch to Application User

```bash
sudo su - relas
```

### 2.2 Clone Repository

```bash
cd /home/relas
git clone https://github.com/your-username/relationship-assistant.git app
cd app
```

### 2.3 Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production.example .env

# Edit the environment file
nano .env
```

**Required Configuration:**

```bash
# Database
DATABASE_URL="postgresql://relas_user:SECURE_PASSWORD@postgres:5432/relas_production"
POSTGRES_DB=relas_production
POSTGRES_USER=relas_user
POSTGRES_PASSWORD=SECURE_PASSWORD

# Domain
NEXTAUTH_URL="https://your-domain.com"
APP_URL="https://your-domain.com"

# Generate a secure secret
NEXTAUTH_SECRET="your-32-character-secure-secret"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Stripe (from Stripe Dashboard)
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
SUBSCRIPTION_PRICE_ID="price_..."

# Twilio (from Twilio Console)
TWILIO_ACCOUNT_SID="ACxxxxx..."
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WHATSAPP_NUMBER="whatsapp:+1234567890"

# OpenAI
OPENAI_API_KEY="sk-proj-..."
```

### 2.4 Update Next.js Configuration

Edit `next.config.js` to enable standalone output:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
}

module.exports = nextConfig
```

### 2.5 Deploy Application

```bash
# Run the deployment script
./deployment/scripts/deploy.sh
```

This will:
- ✅ Build Docker containers
- ✅ Start all services (app, database, nginx)
- ✅ Run database migrations
- ✅ Generate Prisma client

## Step 3: Domain and SSL Setup

### 3.1 Configure DNS

Point your domain to your VPS IP:
```
A record: your-domain.com → YOUR_VPS_IP
A record: www.your-domain.com → YOUR_VPS_IP
```

### 3.2 Set up SSL Certificate

```bash
# Run as root
sudo ./deployment/scripts/ssl-setup.sh your-domain.com
```

This will:
- ✅ Install Let's Encrypt certificates
- ✅ Update nginx configuration
- ✅ Set up auto-renewal

## Step 4: Service Configuration

### 4.1 Configure External Services

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`

#### Stripe Webhooks
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Developers → Webhooks
3. Add endpoint: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

#### Twilio Webhooks
1. Go to [Twilio Console](https://console.twilio.com)
2. Go to Phone Numbers → Manage → Active numbers
3. Click your phone number
4. Set webhook URL: `https://your-domain.com/api/twilio/webhook`
5. Set HTTP method: POST

### 4.2 Start System Service

```bash
# Start the systemd service
sudo systemctl start relas.service

# Check status
sudo systemctl status relas.service

# Enable auto-start on boot
sudo systemctl enable relas.service
```

## Step 5: Verification and Testing

### 5.1 Check Application Status

```bash
# Check running containers
docker-compose ps

# View application logs
docker-compose logs -f app

# Check nginx logs
docker-compose logs -f nginx
```

### 5.2 Test Application

1. **Visit your domain**: `https://your-domain.com`
2. **Test authentication**: Try Google login
3. **Test webhooks**: 
   - Create a test subscription
   - Send a test SMS to your Twilio number

### 5.3 Monitor Resources

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check docker stats
docker stats
```

## Step 6: Maintenance and Monitoring

### 6.1 Backup Setup

Set up automatic daily backups:

```bash
# Add to crontab
crontab -e

# Add this line for daily backup at 3 AM
0 3 * * * /home/relas/app/deployment/scripts/backup.sh
```

### 6.2 Log Monitoring

```bash
# View application logs
docker-compose logs -f app

# View nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# View system logs
sudo journalctl -f -u relas.service
```

### 6.3 Updates and Maintenance

```bash
# Update application (as relas user)
cd /home/relas/app
git pull origin main
./deployment/scripts/deploy.sh

# Update system packages (as root)
sudo apt update && sudo apt upgrade -y

# Backup before major updates
./deployment/scripts/backup.sh
```

## Troubleshooting

### Common Issues

**🔧 Container won't start**
```bash
# Check logs
docker-compose logs app

# Rebuild container
docker-compose build --no-cache app
docker-compose up -d app
```

**🔧 Database connection issues**
```bash
# Check database logs
docker-compose logs postgres

# Connect to database directly
docker-compose exec postgres psql -U relas_user -d relas_production
```

**🔧 SSL certificate issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal
```

**🔧 High memory usage**
```bash
# Check Docker memory usage
docker stats

# Restart services
docker-compose restart
```

### Log Files Locations

- Application logs: `docker-compose logs app`
- Nginx logs: `docker-compose logs nginx`
- System logs: `/var/log/syslog`
- Backup logs: `/home/relas/backups/`

## Security Considerations

### 🔒 Security Checklist

- ✅ Firewall configured (only 22, 80, 443 open)
- ✅ Fail2ban active for SSH protection
- ✅ SSL certificates with auto-renewal
- ✅ Regular security updates
- ✅ Strong database passwords
- ✅ Environment variables secured
- ✅ Regular backups

### 🔄 Regular Security Tasks

1. **Weekly**: Check fail2ban logs
2. **Monthly**: Update system packages
3. **Quarterly**: Review access logs for suspicious activity
4. **Annually**: Rotate API keys and secrets

## Performance Optimization

### Resource Monitoring

```bash
# Monitor system resources
htop

# Monitor Docker containers
docker stats

# Check disk usage
df -h
du -sh /var/lib/docker/
```

### Scaling Considerations

- **Vertical Scaling**: Upgrade VPS (more CPU/RAM)
- **Database**: Consider managed PostgreSQL for high traffic
- **CDN**: Add CloudFlare for static assets
- **Load Balancer**: Multiple VPS instances behind load balancer

## Support and Maintenance

### Backup Strategy

- ✅ Daily database backups (retention: 30 days)
- ✅ Weekly full system snapshots (Hetzner snapshots)
- ✅ Configuration files in version control

### Monitoring

- Application health checks via nginx
- Database connection monitoring
- SSL certificate expiration alerts
- Disk space monitoring

---

## Quick Reference Commands

```bash
# Deployment
./deployment/scripts/deploy.sh

# View logs
docker-compose logs -f app

# Restart application
docker-compose restart app

# Backup database
./deployment/scripts/backup.sh

# SSL renewal
sudo certbot renew

# System status
sudo systemctl status relas.service
```

Your Relationship Assistant should now be successfully deployed on Hetzner VPS! 🎉