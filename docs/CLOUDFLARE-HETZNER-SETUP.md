# Cloudflare + Hetzner Deployment Setup

This guide walks you through setting up your Relationship Assistant application on Hetzner Cloud with Cloudflare as your CDN and SSL provider.

## Overview

- **Hetzner Cloud**: VPS hosting for your application
- **Cloudflare**: CDN, SSL termination, DDoS protection, and DNS
- **Nginx**: Reverse proxy (HTTP only, Cloudflare handles HTTPS)
- **Docker**: Containerization platform

## Prerequisites

- Domain name you own
- Hetzner Cloud account
- Cloudflare account (free tier is sufficient)

## Part 1: Hetzner Cloud Setup

### 1.1 Create a Server

1. **Log into Hetzner Cloud Console**: https://console.hetzner-cloud.com/
2. **Create a new project** (or use existing)
3. **Add a server**:
   - **Location**: Choose closest to your users (e.g., `ashburn-va` for US East)
   - **Image**: Ubuntu 22.04 LTS
   - **Type**: 
     - **Development**: CPX11 (2 vCPU, 4GB RAM) - €4.51/month
     - **Production**: CPX21 (3 vCPU, 8GB RAM) - €8.21/month
   - **SSH Keys**: Add your SSH public key
   - **Firewalls**: Create firewall with these rules:
     ```
     Inbound:
     - SSH (22): Your IP only
     - HTTP (80): 0.0.0.0/0 (Cloudflare will proxy)
     - HTTPS (443): 0.0.0.0/0 (for direct access if needed)
     
     Outbound: Allow all
     ```
   - **Name**: `relas-app-server`

4. **Note the IP address** - you'll need this for DNS setup

### 1.2 Initial Server Setup

SSH into your server:
```bash
ssh root@YOUR_SERVER_IP
```

Update system and install Docker:
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create application user
useradd -m -s /bin/bash relas
usermod -aG docker relas

# Set up SSH for the relas user
mkdir -p /home/relas/.ssh
cp /root/.ssh/authorized_keys /home/relas/.ssh/
chown -R relas:relas /home/relas/.ssh
chmod 700 /home/relas/.ssh
chmod 600 /home/relas/.ssh/authorized_keys
```

## Part 2: Cloudflare Setup

### 2.1 Add Your Domain to Cloudflare

1. **Log into Cloudflare**: https://dash.cloudflare.com/
2. **Add a site**: Enter your domain name
3. **Choose a plan**: Free plan is sufficient for most use cases
4. **Cloudflare will scan your DNS records**
5. **Update nameservers**: Change your domain's nameservers to Cloudflare's
   - This is done at your domain registrar (GoDaddy, Namecheap, etc.)
   - Wait for propagation (can take up to 24 hours)

### 2.2 Configure DNS Records

In Cloudflare DNS settings, add these records:

```
Type: A
Name: @ (or your domain)
IPv4: YOUR_HETZNER_SERVER_IP
Proxy: ON (orange cloud)

Type: A  
Name: www
IPv4: YOUR_HETZNER_SERVER_IP
Proxy: ON (orange cloud)

Type: A
Name: test (if using test subdomain)
IPv4: YOUR_HETZNER_SERVER_IP  
Proxy: ON (orange cloud)
```

### 2.3 Configure SSL/TLS Settings

1. **Go to SSL/TLS tab**
2. **Set encryption mode**: `Flexible` (Cloudflare to visitor: encrypted, Cloudflare to server: unencrypted)
3. **Enable "Always Use HTTPS"**: Under SSL/TLS → Edge Certificates
4. **Enable "Automatic HTTPS Rewrites"**: Under SSL/TLS → Edge Certificates

### 2.4 Configure Security Settings

1. **Go to Security tab**
2. **Set Security Level**: `Medium` (adjust based on your needs)
3. **Enable Bot Fight Mode**: Helps prevent automated attacks
4. **Configure Firewall Rules** (optional):
   ```
   Rule: Block traffic from specific countries if needed
   Expression: (ip.geoip.country ne "US" and ip.geoip.country ne "CA")
   Action: Block
   ```

### 2.5 Configure Caching

1. **Go to Caching tab**
2. **Set Caching Level**: `Standard`
3. **Create Page Rules** for better caching:
   ```
   URL: your-domain.com/_next/static/*
   Settings: Cache Level = Cache Everything, Edge Cache TTL = 1 year
   
   URL: your-domain.com/api/*  
   Settings: Cache Level = Bypass
   ```

## Part 3: Application Deployment

### 3.1 Deploy Application on Hetzner

SSH as the relas user:
```bash
ssh relas@YOUR_SERVER_IP
```

Clone and set up the application:
```bash
# Clone the repository
git clone https://github.com/AnuragRamdasan/relas.git app
cd app

# Copy environment file
cp .env.production.example .env

# Edit environment variables
nano .env
```

### 3.2 Configure Environment Variables

Update `.env` with your settings:
```bash
# Database
DATABASE_URL="postgresql://relas_user:your_secure_password@postgres:5432/relas_db"
POSTGRES_DB=relas_db
POSTGRES_USER=relas_user
POSTGRES_PASSWORD=your_secure_password

# App Settings  
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_very_long_random_secret_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Node Environment
NODE_ENV=production
```

### 3.3 Configure Nginx for Cloudflare

Replace the nginx configuration:
```bash
# Backup current config
cp nginx/sites/relas.conf nginx/sites/relas.conf.backup

# Use Cloudflare-optimized config
cp nginx/sites/relas-cloudflare.conf nginx/sites/relas.conf
```

Update the domain in the config:
```bash
sed -i 's/test.anuragramdasan.com/your-domain.com/g' nginx/sites/relas.conf
```

### 3.4 Deploy the Application

Run the deployment script:
```bash
chmod +x deployment/scripts/deploy.sh
./deployment/scripts/deploy.sh
```

## Part 4: Configure External Services

### 4.1 Twilio Webhook Configuration

1. **Log into Twilio Console**: https://console.twilio.com/
2. **Go to Phone Numbers → Manage → Active numbers**
3. **Click on your Twilio phone number**
4. **Set webhook URL**: `https://your-domain.com/api/twilio/webhook`
5. **Set HTTP method**: `POST`
6. **Save configuration**

### 4.2 Stripe Webhook Configuration

1. **Log into Stripe Dashboard**: https://dashboard.stripe.com/
2. **Go to Developers → Webhooks**
3. **Add endpoint**: `https://your-domain.com/api/stripe/webhook`
4. **Select events**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the webhook secret** and update your `.env` file

## Part 5: Monitoring and Maintenance

### 5.1 Health Checks

Test your application:
```bash
# Test application health
curl -I https://your-domain.com/health

# Test API endpoint
curl -I https://your-domain.com/api/health

# Check Docker containers
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f nginx
```

### 5.2 SSL Certificate Verification

Check SSL status:
- Visit: https://www.ssllabs.com/ssltest/
- Enter your domain
- Should show A+ rating with Cloudflare

### 5.3 Cloudflare Analytics

Monitor your application:
1. **Go to Analytics & Logs** in Cloudflare
2. **View traffic patterns, threats blocked, bandwidth saved**
3. **Set up custom events** for important metrics

### 5.4 Server Monitoring

Set up basic monitoring:
```bash
# Install htop for process monitoring
sudo apt install htop

# Check disk usage
df -h

# Check memory usage  
free -h

# Check Docker stats
docker stats
```

## Part 6: Backup and Recovery

### 6.1 Database Backups

Create automated backup script:
```bash
# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/relas/backups"
BACKUP_FILE="$BACKUP_DIR/relas-db-$(date +%Y%m%d-%H%M%S).sql"

mkdir -p $BACKUP_DIR
cd ~/app
docker-compose exec -T postgres pg_dump -U relas_user relas_db > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x ~/backup-db.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/relas/backup-db.sh") | crontab -
```

### 6.2 Application Code Backups

Your code is backed up in Git, but for additional safety:
```bash
# Create application backup
tar -czf ~/app-backup-$(date +%Y%m%d).tar.gz ~/app --exclude=node_modules --exclude=.git
```

## Part 7: Troubleshooting

### 7.1 Common Issues

**Application not accessible:**
```bash
# Check if containers are running
docker-compose ps

# Check nginx logs
docker-compose logs nginx

# Check application logs  
docker-compose logs app

# Restart services
docker-compose restart
```

**Database connection issues:**
```bash
# Check postgres logs
docker-compose logs postgres

# Test database connection
docker-compose exec app npx prisma db push
```

**SSL/HTTPS issues:**
- Verify Cloudflare SSL mode is set to "Flexible"
- Check that DNS records are proxied (orange cloud)
- Wait for SSL certificate provisioning (can take up to 24 hours)

### 7.2 Performance Issues

**High memory usage:**
```bash
# Check container resources
docker stats

# Restart application
docker-compose restart app
```

**Slow response times:**
- Check Cloudflare Analytics for cache hit rate
- Optimize database queries
- Consider upgrading server size

### 7.3 Cloudflare 521 Errors

**521 Error means "Web server is down":**
```bash
# Quick fix (run on your server)
./deployment/scripts/fix-521.sh

# Detailed diagnosis
./deployment/scripts/troubleshoot-521.sh
```

**Common causes:**
- Nginx container not running or crashed
- Wrong nginx configuration (not using Cloudflare config)
- Port 80 not accessible from outside
- Application container not responding
- Firewall blocking port 80

**Manual troubleshooting:**
```bash
# Check container status
docker-compose ps

# Restart containers
docker-compose restart

# Check if port 80 is bound
netstat -tlnp | grep :80

# Test local connectivity
curl -I http://localhost:80
```

### 7.4 Log Analysis

**View specific logs:**
```bash
# Application logs with timestamps
docker-compose logs -f --timestamps app

# Filter logs for errors
docker-compose logs app | grep -i error

# Follow nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log
```

## Part 8: Security Best Practices

### 8.1 Server Security

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure firewall (if not using Hetzner firewall)
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Disable root SSH login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 8.2 Application Security

- **Keep dependencies updated**: Regularly run `npm audit` and update packages
- **Monitor failed login attempts**: Check application logs for suspicious activity
- **Use strong environment variables**: Generate secure secrets for JWT and database passwords
- **Enable Cloudflare's security features**: WAF, rate limiting, bot protection

### 8.3 Database Security

- **Use strong passwords**: Generate complex passwords for database users
- **Limit database access**: Only allow connections from application container
- **Regular backups**: Ensure automated backups are working

## Part 9: Scaling Considerations

### 9.1 Horizontal Scaling

When you need more capacity:
1. **Load Balancer**: Use Hetzner Load Balancer to distribute traffic
2. **Multiple App Servers**: Deploy application on multiple servers
3. **Shared Database**: Use managed PostgreSQL service
4. **Redis Session Store**: For session sharing across instances

### 9.2 Vertical Scaling

Upgrade server resources:
1. **In Hetzner Console**: Go to your server → Resize
2. **Choose larger server type**: More CPU/RAM
3. **Resize**: Process takes a few minutes with brief downtime

## Support and Resources

- **Hetzner Cloud Docs**: https://docs.hetzner.com/cloud/
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Next.js Deployment**: https://nextjs.org/docs/deployment

## Costs Overview

**Monthly costs (USD):**
- **Hetzner CPX11**: ~$5/month (development)
- **Hetzner CPX21**: ~$9/month (production)
- **Cloudflare**: Free (Pro $20/month for advanced features)
- **Domain**: $10-15/year
- **Total**: ~$5-10/month + domain costs

This setup provides enterprise-grade hosting with global CDN, SSL, and DDoS protection at a very affordable cost.