# Deployment Troubleshooting Guide

## Issue: Nginx Container Keeps Restarting

**Symptoms:**
- Deployment script shows "Services are running" but nginx shows "Restarting (1)"
- Domain is not accessible
- App container works but nginx fails

### Root Cause Analysis

The nginx container is failing because:

1. **SSL Certificate Missing**: The nginx config references SSL certificates that don't exist
2. **Domain Placeholder**: Config still has "your-domain.com" instead of actual domain
3. **SSL Dependency**: nginx tries to load SSL config before certificates are installed

### Solution Steps

#### Step 1: Use HTTP-Only Configuration First

```bash
# 1. Stop current nginx
docker-compose stop nginx

# 2. Use HTTP-only config temporarily
cp nginx/sites/relas-http-only.conf nginx/sites/relas.conf

# 3. Update domain in config
./deployment/scripts/fix-domain.sh your-actual-domain.com

# 4. Start nginx
docker-compose start nginx
```

#### Step 2: Verify HTTP Access

```bash
# Check if domain resolves to your server
nslookup your-domain.com

# Test HTTP access
curl -I http://your-domain.com
```

#### Step 3: Set Up SSL Certificate

```bash
# Only after HTTP works, set up SSL
sudo ./deployment/scripts/ssl-setup.sh your-domain.com

# Then switch back to full SSL config
cp nginx/sites/relas.conf.backup nginx/sites/relas.conf
./deployment/scripts/fix-domain.sh your-domain.com
docker-compose restart nginx
```

## Quick Diagnostic Commands

```bash
# Check container status
docker-compose ps

# Check nginx logs
docker-compose logs nginx

# Check if app is accessible directly
curl http://localhost:3000

# Check which ports are open
netstat -tlnp | grep -E ':(80|443|3000)'

# Test domain DNS
nslookup your-domain.com
```

## Common Issues & Solutions

### 1. **Nginx Won't Start - SSL Certificate Error**

**Error:** `nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/..."`

**Solution:**
```bash
# Use HTTP-only config first
cp nginx/sites/relas-http-only.conf nginx/sites/relas.conf
./deployment/scripts/fix-domain.sh your-domain.com
docker-compose restart nginx
```

### 2. **Domain Not Accessible - DNS Issues**

**Error:** `Connection refused` or `DNS not found`

**Solution:**
```bash
# 1. Check DNS
nslookup your-domain.com

# 2. Test with server IP directly
curl http://YOUR-SERVER-IP:3000

# 3. Update DNS records to point to your server
# A record: your-domain.com -> YOUR-SERVER-IP
```

### 3. **App Works on Port 3000 but Not Domain**

**Error:** `http://SERVER-IP:3000` works but `http://your-domain.com` doesn't

**Solution:**
```bash
# Check nginx status
docker-compose logs nginx

# Restart nginx
docker-compose restart nginx

# Verify nginx config
docker-compose exec nginx nginx -t
```

### 4. **SSL Certificate Installation Fails**

**Error:** Let's Encrypt fails to validate domain

**Solution:**
```bash
# 1. Ensure domain DNS points to server
# 2. Ensure port 80 is accessible
# 3. Try manual certificate request

# Check if port 80 is blocked
curl -I http://your-domain.com/.well-known/acme-challenge/test

# Manual certbot command
sudo certbot certonly --webroot -w /var/www/certbot -d your-domain.com
```

## Production Checklist

Before going live, verify:

- [ ] Domain DNS points to your server IP
- [ ] Ports 80 and 443 are open and accessible
- [ ] App container is running and healthy
- [ ] Environment variables are configured with production API keys
- [ ] Database migrations completed successfully
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Webhook URLs configured in Stripe/Twilio consoles
- [ ] Google OAuth redirect URLs updated for your domain

## Emergency Recovery

If everything breaks:

```bash
# 1. Stop all services
docker-compose down

# 2. Check logs
docker-compose logs

# 3. Start minimal setup
docker-compose up app postgres

# 4. Test app directly
curl http://localhost:3000

# 5. Fix issues and restart nginx
docker-compose up nginx
```

## Getting Help

1. **Check logs first**: `docker-compose logs -f`
2. **Use diagnostic script**: `./deployment/scripts/diagnose.sh`
3. **Test connectivity**: Direct IP access on port 3000
4. **Verify DNS**: Domain resolves to correct IP
5. **Check firewall**: Ports 80, 443, 3000 accessible